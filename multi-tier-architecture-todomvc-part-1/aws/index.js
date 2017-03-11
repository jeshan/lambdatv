// original source: https://github.com/meconlin/lambda-generic-microservice/blob/master/index.js
// modified to work with Amazon API Gateway
//  microservice lambda config
//
//  Change DynamoDB setup to use this index.js with a different dynamoDB
//  table     : dynamoDB table name
//  keyName   : name of hash key in the dynamoDB
//  keys      : valid hash keys for this dynamoDB table
//

var config = {
    table: 'todo',
    keyName: 'id',
    keys: ['completed', 'title']
};

var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient();
var DYNAMODB_ERROR_CONDITIONAL_CHECK = "ConditionalCheckFailedException";

// custom error returns
// using http status messages here in case AWS API Gateway is in play in front of this Lambda,
// response mapping to appropriate status codes in the API gateway occurs using regex
var messageNotFound = function (key) {
    return {
        statusCode: 404,
        body: JSON.stringify({message: "NOT_FOUND : " + key})
    };
};

var messageServerError = function (err) {
    return {
        statusCode: 500,
        body: JSON.stringify({message: "INTERNAL_ERROR : " + err})
    };
};

var messageConflict = function (err) {
    return {
        statusCode: 409,
        body: JSON.stringify({message: "CONFLICT : " + err})
    };
};

var messageBadRequest = function (err) {
    return {
        statusCode: 400,
        body: JSON.stringify({message: "BAD_REQUEST : " + err})
    };
};

var messageSucceeded = function (code, results, origin) {
    // Note: don't set origin as global variable, always pass it in from the current event object
    return {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": origin // Required for CORS support to work
        },
        body: JSON.stringify(results)
    };
};

var conditionExpressionNotExists = function (key) {
    return "attribute_not_exists(" + key + ")";
};

function getDomainOrigin(event) {
    if (event.headers === null) {
        return null;
    }
    if (event.headers.Origin === process.env['ORIGIN']) {
        return event.headers.Origin;
    }
    return null;
}

exports.handler = function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    var operation = event.httpMethod;
    var body = event.body == null ? {} : JSON.parse(event.body);
    var id = undefined;// parseInt(body.id || event.queryStringParameters.id);
    var origin = getDomainOrigin(event);
    console.log("got origin", origin);
    if (body && body.id) {
        id = parseInt(body.id);
    } else if (event.queryStringParameters && event.queryStringParameters.id) {
        id = parseInt(event.queryStringParameters.id);
    }
    var params = {Key: {}, TableName: config.table};
    if (id) {
        params.Key[config.keyName] = id;
    }

    switch (operation) {
        case 'POST':
            delete params.Key;
            params.Item = {
                id: new Date().getTime(),
                completed: false
            };
            //dont double create
            params.ConditionExpression = conditionExpressionNotExists(config.keyName);

            // update default create with any keys from the post body
            // ignores keys we dont know about
            for (var i = 0; i < config.keys.length; i++) {
                if (body.hasOwnProperty(config.keys[i])) {
                    params.Item[config.keys[i]] = body[config.keys[i]];
                }
            }

            docClient.put(params, function (err, res) {
                if (err) {
                    if (DYNAMODB_ERROR_CONDITIONAL_CHECK === err.code) {
                        context.succeed(messageConflict(err));
                    } else {
                        context.succeed(messageServerError(err));
                    }
                } else {
                    context.succeed(messageSucceeded(201, {id: params.Item.id}, origin));
                }
            });
            break;
        case 'GET':
            var callback = function (err, res) {
                if (err) {
                    context.succeed(messageServerError(err));
                } else {
                    if (!Object.keys(res).length) {
                        context.succeed(messageNotFound(id));
                    } else {
                        context.succeed(messageSucceeded(200, res.Item || res.Items, origin));
                    }
                }
            };
            if (id) {
                docClient.get(params, callback);
            } else {
                docClient.scan(params, callback);
            }
            break;
        case 'PUT':
            var attributeUpdates = {};
            // this update will also function as a CREATE?
            // update valid keys that were sent
            for (var i = 0; i < config.keys.length; i++) {
                if (body.hasOwnProperty(config.keys[i])) {
                    attributeUpdates[config.keys[i]] = {Action: 'PUT', Value: body[config.keys[i]]};
                }
            }

            if (!Object.keys(attributeUpdates).length) {
                context.succeed(messageBadRequest('no valid keys for update in body'));
            } else {
                params.AttributeUpdates = attributeUpdates;
                params.ReturnValues = "ALL_NEW";
                docClient.update(params, function (err, res) {
                    if (err) {
                        context.succeed(messageServerError(err));
                    } else {
                        context.succeed(messageSucceeded(204, {}, origin));
                    }
                });
            }
            break;
        case 'DELETE':
            // filter is just for the todoMvc app which doesn't delete all items
            // but only those that are marked as completed

            docClient.scan({
                FilterExpression: 'completed = :completed',
                ExpressionAttributeValues: {
                    ':completed': true
                },
                TableName: config.table
            }, function (err, data) {
                var items = data.Items;
                params = {RequestItems: {}};
                params.RequestItems[config.table] = [];

                if (id) {
                    params.RequestItems[config.table].push({DeleteRequest: {Key: {id: id}}});
                } else {
                    for (var i = 0; i < items.length; ++i) {
                        var item = items[i];
                        params.RequestItems[config.table].push({DeleteRequest: {Key: {id: item.id}}});
                    }
                }
                docClient.batchWrite(params, function (err, res) {
                    if (err) {
                        context.succeed(messageServerError(err));
                    } else {
                        context.succeed(messageSucceeded(204, {}, origin));
                    }
                });
            });
            break;
        default:
            context.succeed(messageServerError('unrecognized operation - ' + operation));
    }
};
