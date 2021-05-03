require('dotenv').config()
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as alb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as route53 from '@aws-cdk/aws-route53';
import { Role, ServicePrincipal, PolicyStatement } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { Duration, CustomResource } from "@aws-cdk/core";

export class OpenBankingAuthStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // ------ OPENID CONNECT PROVIDER CONFIGURATION 

    // VPC Definition
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "MyCluster", {
      vpc: vpc
    });

    // Fargate Task Definition
    // Create a load-balanced Fargate service and make it public
    const repo = ecr.Repository.fromRepositoryArn(this, 'node-oidc-provider', <string>process.env.ECR_REPOSITORY_ARN)
    const oidc_service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "NodeOIDCService", {
      cluster: cluster,
      cpu: 256, // Default is 256
      desiredCount: 1, // Default is 1
      taskImageOptions: { image: ecs.ContainerImage.fromEcrRepository(repo, <string>process.env.ECR_OIDC_IMAGE_TAG) },
      memoryLimitMiB: 512, // Default is 512
      publicLoadBalancer: true, // Default is false
      redirectHTTP: true,
      listenerPort: 443,
      protocol: alb.ApplicationProtocol.HTTPS,
      certificate: acm.Certificate.fromCertificateArn(this, "ALB-Certificate", <string>process.env.ACM_CERTIFICATE_ARN),
      domainName: process.env.R53_DOMAIN_NAME,
      domainZone: route53.HostedZone.fromHostedZoneAttributes(this, "myZone", { zoneName: <string>process.env.R53_ZONE_NAME, hostedZoneId: <string>process.env.R53_HOSTED_ZONE_ID })
    });
    oidc_service.targetGroup.configureHealthCheck({
      path: '/.well-known/openid-configuration',
      port: "80",
      interval: Duration.seconds(10),
      healthyThresholdCount: 2
    });

    // ------ END OF OPENID CONNECT PROVIDER CONFIGURATION 

    // ------ API GATEWAY CONFIGURATION

    // API Gateway Definition
    const api = new apigateway.RestApi(this, "OpenBankingAPI", {
      restApiName: "Open Banking API",
      description: "This API exposes Open Banking services."
    });

    const OIDC_JWKS_ENDPOINT = `https://${process.env.R53_DOMAIN_NAME}${process.env.JWKS_URI}`

    // Lambda Authorizer
    const LambdaAuthorizeRole = new Role(this, 'LambdaAuthorizerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    LambdaAuthorizeRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'secretsmanager:GetSecretValue', 'sts:AssumeRole'],
    }));

    const jwtAuthorizer = new lambda.Function(this, "LambdaAuthHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources/lambda"),
      handler: "lambda-auth.handler",
      role: LambdaAuthorizeRole,
      environment: {
        JWKS_ENDPOINT: OIDC_JWKS_ENDPOINT,
        API_ID: api.restApiId,
        ACCOUNT_ID: <string>process.env.CDK_DEFAULT_ACCOUNT,
        SM_JWKS_SECRET_NAME: <string>process.env.SM_JWKS_SECRET_NAME
      }
    });
    jwtAuthorizer.node.addDependency(oidc_service);

    // Lambda Backend Integration
    const backendHandler = new lambda.Function(this, "BackendHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources/lambda"),
      handler: "backend.handler"
    });

    // Add Lambda Authorizer to Gateway
    const authorizer = new apigateway.TokenAuthorizer(this, 'JWTAuthorizer', {
      handler: jwtAuthorizer,
      validationRegex: "^(Bearer )[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)$"
    });

    // Create Protected Resource
    const getApiIntegration = new apigateway.LambdaIntegration(backendHandler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    // Define HTTP Method for Resource with Lambda Authorizer
    api.root.addMethod("GET", getApiIntegration, { authorizer }); // GET 

    // ------ END OF API GATEWAY CONFIGURATION


    // ------ SECRETS MANAGER CONFIGURATION FOR JWKS INFORMATION

    // Custom Resource to Create Secrets Manager with JWKS KID
    const customResourceRole = new Role(this, 'CustomResourceLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    customResourceRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'secretsmanager:*', 'sts:AssumeRole'],
    }));

    const customSecretsManagerLambda = new lambda.Function(this, "CustomSecretsManagerHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources/lambda"),
      handler: "custom-secrets-manager.handler",
      timeout: Duration.minutes(5),
      role: customResourceRole,
      environment: {
        JWKS_ENDPOINT: OIDC_JWKS_ENDPOINT,
        SM_JWKS_SECRET_NAME: <string>process.env.SM_JWKS_SECRET_NAME
      }
    });
    customSecretsManagerLambda.node.addDependency(oidc_service);

    new CustomResource(this, 'JwksSecretsManager', {
      serviceToken: customSecretsManagerLambda.functionArn
    });
    // ------ END OF SECRETS MANAGER CONFIGURATION FOR JWKS INFORMATION

  }

}