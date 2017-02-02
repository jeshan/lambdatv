#!/usr/bin/env bash

# README
# Run this script with a user that has administrator access.
# This will make it simpler to create all the required resources in one go.
# Example:
# USER=an-admin
# aws iam create-user --user-name $USER
# aws iam attach-user-policy --user-name $USER --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
# aws iam create-access-key --user-name $USER
# then take the output of the previous command and run aws configure set access_key secret_key


ACCOUNT_ID=`aws sts get-caller-identity --query 'Account' --output text`
TABLE_NAME=todo
API_NAME=multi-tier
ROLE_NAME=${API_NAME}
REGION=`aws configure get region`

cd `dirname "$0"`

# data-tier: dynamodb

aws dynamodb create-table --table-name ${TABLE_NAME} \
  --attribute-definitions AttributeName=id,AttributeType=N \
  --key-schema KeyType=HASH,AttributeName=id \
  --provisioned-throughput WriteCapacityUnits=1,ReadCapacityUnits=1

# permissions iam

# sed is used to replace variables that may be unique among different users

sed -e 's/REGION/'${REGION}'/g; s/ACCOUNT_ID/'$ACCOUNT_ID'/g; s/API_NAME/'$API_NAME'/g' \
  role-policy-document.template.json > role-policy-document.json

ROLE_ARN=`aws iam create-role --role-name ${ROLE_NAME} --assume-role-policy-document \
  file://trust-relationship-policy-document.json --query "Role.Arn" --output text`

aws iam put-role-policy --role-name ${ROLE_NAME} --policy-name multi-tier-policy --policy-document file://role-policy-document.json

# logic tier: aws lambda and api gateway

zip lambda-package.zip index.js

echo "Waiting for a few seconds as the role may still be setting up."
sleep 10

FUNCTION_ARN=`aws lambda create-function --function-name ${API_NAME} --runtime nodejs4.3 \
  --role $ROLE_ARN --handler "index.handler" \
  --zip-file fileb://lambda-package.zip --query "FunctionArn" --output text`

#aws lambda get-policy --function-name multi-tier

# api gateway

API_ID=`aws apigateway create-rest-api --name ${API_NAME} --query "id" --output text`

ROOT_PATH_ID=`aws apigateway get-resources --rest-api-id ${API_ID} --query "items[0].id" \
  --output text`

RESOURCE_ID=`aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${ROOT_PATH_ID} \
  --path-part ${API_NAME} --query "id" --output text`

aws apigateway put-method --rest-api-id ${API_ID} --http-method "ANY" \
  --authorization-type "NONE" --no-api-key-required --resource-id ${RESOURCE_ID}

aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${RESOURCE_ID} \
  --type AWS_PROXY --http-method ANY --integration-http-method POST \
  --uri "arn:aws:apigateway:"${REGION}":lambda:path/2015-03-31/functions/"${FUNCTION_ARN}"/invocations"

aws apigateway put-method-response --rest-api-id ${API_ID} --resource-id ${RESOURCE_ID} \
  --status-code 200 --http-method ANY

aws apigateway put-method --rest-api-id ${API_ID} --http-method OPTIONS \
  --authorization-type "NONE" --no-api-key-required --resource-id ${RESOURCE_ID}

aws apigateway put-method-response --rest-api-id ${API_ID} --resource-id ${RESOURCE_ID} \
  --status-code 200 --http-method OPTIONS \
  --response-parameters "method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Origin=true,method.response.header.Access-Control-Allow-Methods=true"

aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${RESOURCE_ID} \
  --type MOCK --http-method OPTIONS --request-templates "{\"application/json\":\"{\\\"statusCode\\\":200}\"}"

aws apigateway put-integration-response --rest-api-id ${API_ID} --resource-id ${RESOURCE_ID} \
  --status-code 200 --http-method OPTIONS --response-parameters "{\"method.response.header.Access-Control-Allow-Headers\":\"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\",\"method.response.header.Access-Control-Allow-Origin\":\"'*'\",\"method.response.header.Access-Control-Allow-Methods\":\"'DELETE,GET,HEAD,PATCH,POST,PUT'\"}"

aws lambda add-permission --function-name ${FUNCTION_ARN} --action "lambda:InvokeFunction" \
  --statement-id 1 --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:"${REGION}":"${ACCOUNT_ID}":"${API_ID}"/*/*/"${API_NAME}

STAGE_NAME="prod"
aws apigateway create-deployment --rest-api-id ${API_ID} --stage-name ${STAGE_NAME}

API_GATEWAY_BASE_URL="https://"${API_ID}".execute-api."${REGION}".amazonaws.com/"${STAGE_NAME}"/"${API_NAME}
echo "api available at: "$API_GATEWAY_BASE_URL" . Now set the apiGatewayBaseUrl constant to be\
 equal to this url in js/services/todoStorage.js. When you've done that, set a domain in\
 2-setup-presentation-tier.sh and execute it to continue"
