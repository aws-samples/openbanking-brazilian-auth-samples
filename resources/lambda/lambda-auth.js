const util = require('util');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const AWS = require('aws-sdk');
const secretsmanager = new AWS.SecretsManager();

// Configure the JWKS URI endppoint from your OIDC provider 
const client = jwksClient({ jwksUri: process.env.JWKS_ENDPOINT });
let jwks, kid;

const apiPermissions = [
    {
        "arn": `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:${process.env.API_ID}`, // NOTE: Replace with your API Gateway API ARN
        "resource": "*", // NOTE: Replace with your API Gateway Resource
        "stage": "prod", // NOTE: Replace with your API Gateway Stage
        "httpVerb": "GET", // NOTE: Replcae with the HTTP Verbs you want to allow access your REST Resource
        "scope": "email" // NOTE: Replace with the proper OAuth scopes that can access your REST Resource
    }
];

const defaultDenyAllPolicy = {
    "principalId": "user",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "execute-api:Invoke",
                "Effect": "Deny",
                "Resource": "*"
            }
        ]
    }
};

function generatePolicyStatement(apiName, apiStage, apiVerb, apiResource, action) {
    // Generate an IAM policy statement
    const statement = {};
    statement.Action = 'execute-api:Invoke';
    statement.Effect = action;
    const methodArn = apiName + "/" + apiStage + "/" + apiVerb + "/" + apiResource;
    statement.Resource = methodArn;
    return statement;
};

function generatePolicy(principalId, policyStatements) {
    // Generate a fully formed IAM policy
    const authResponse = {};
    authResponse.principalId = principalId;
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = policyStatements;
    authResponse.policyDocument = policyDocument;
    return authResponse;
};

async function verifyAccessToken(accessToken) {
    /*
    * Verify the access token with your Identity Provider here (check if your
    * Identity Provider provides an SDK).
    *
    * This example assumes this method returns a Promise that resolves to
    * the decoded token, you may need to modify your code according to how
    * your token is verified and what your Identity Provider returns.
    * 
    * Fetch the KID attribute from your JWKS Endpoint to verify its integrity
    * You can either use a Environment Variable containing the KID or call AWS Secrets Manager with KID already securely stored.
    */
    const data = await secretsmanager.getSecretValue({ SecretId: process.env.SM_JWKS_SECRET_NAME }).promise();
    jwks = JSON.parse(data.SecretString);
    kid = jwks.keys[0].kid;

    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();
    const decoded = jwt.verify(accessToken, signingKey);
    return decoded
};

function generateIAMPolicy(scopeClaims) {
    // Declare empty policy statements array
    const policyStatements = [];
    // Iterate over API Permissions
    for (let i = 0; i < apiPermissions.length; i++) {
        // Check if token scopes exist in API Permission
        if (scopeClaims.indexOf(apiPermissions[i].scope) > -1) {
            // User token has appropriate scope, add API permission to policy statements
            policyStatements.push(generatePolicyStatement(apiPermissions[i].arn, apiPermissions[i].stage,
                apiPermissions[i].httpVerb, apiPermissions[i].resource, "Allow"));
        }
    }
    // Check if no policy statements are generated, if so, create default deny all policy statement
    if (policyStatements.length === 0) {
        return defaultDenyAllPolicy;
    } else {
        return generatePolicy('user', policyStatements);
    }
};

exports.handler = async (event, context) => {
    // Declare Policy
    let iamPolicy = null;
    // Capture raw token and trim 'Bearer ' string, if present
    const token = event.authorizationToken.replace("Bearer ", "");
    console.log('JWT Token', token)
    // Validate token
    await verifyAccessToken(token).then(data => {
        // Retrieve token scopes
        console.log('Decoded and Verified JWT Token', JSON.stringify(data))
        // For testing purposes using a ID token without scopes. If you have an access token with scopes, 
        // uncomment 'data.claims.scp' and pass the array of scopes present in the scp attribute instead.
        const scopeClaims = ['email']// data.claims.scp;
        // Generate IAM Policy
        iamPolicy = generateIAMPolicy(scopeClaims);
    })
        .catch(err => {
            console.log(err);
            iamPolicy = defaultDenyAllPolicy;
        });
    console.log('IAM Policy', JSON.stringify(iamPolicy));
    return iamPolicy;
};

