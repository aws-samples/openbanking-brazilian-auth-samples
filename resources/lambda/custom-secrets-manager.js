const fetch = require('node-fetch')
const AWS = require('aws-sdk')
const response = require('cfn-response');
const secretsmanager = new AWS.SecretsManager();
exports.handler = function (event, context, callback) {
  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  let responseStatus = response.FAILED;
  let responseData = {};
  if (event.RequestType == "Delete") {
    var params = {
      SecretId: process.env.SM_JWKS_SECRET_NAME
    };
    secretsmanager.deleteSecret(params, (err, data) => {
      if (err) {
        responseData = { Error: "Failed to delete AWS Secrets Manager - Secret" };
        console.log(responseData.Error + "\n" + err);
      } else {
        console.log("Secret Delete!", data)
        responseStatus = response.SUCCESS;
        responseData = data;
      }
      response.send(event, context, responseStatus, responseData);
    });
    responseStatus = response.SUCCESS;
    response.send(event, context, responseStatus, responseData);
  } else {
    console.log('CREATE!')
    fetch(process.env.JWKS_ENDPOINT)
      .then(data => data.json())
      .then(keys => {
        console.log("JWKS Key set", keys);
        var params = {
          Description: "JWKS from OIDC Provider",
          Name: process.env.SM_JWKS_SECRET_NAME,
          SecretString: JSON.stringify(keys)
        };

        secretsmanager.createSecret(params, (err, data) => {
          if (err) {
            responseData = { Error: "Failed to create AWS Secrets Manager - Secret" };
            console.log(responseData.Error + "\n" + err);
          } else {
            console.log("Secret Created!", data)
            responseStatus = response.SUCCESS;
            responseData = data;
          }
          response.send(event, context, responseStatus, responseData);
        });
      });
  }
};