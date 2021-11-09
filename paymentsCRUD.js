const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'TB_PAYMENTS';
const paymentsPath = '/payments';
const paymentPath = '/payment';

exports.handler = async function (event) {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === paymentPath:
            response = await getPayment(event.queryStringParameters.PAYMENTS_ID);
            break;
        case event.httpMethod === 'GET' && event.path === paymentsPath:
            response = await getPayments();
            break;
        case event.httpMethod === 'POST' && event.path === paymentPath:
            response = await savePayment(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === paymentPath:
            response = await updatePayment(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === paymentPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyPayment(requestBody.PAYMENTS_ID);
            break;
        case event.httpMethod === 'DELETE' && event.path === paymentPath:
            response = await deletePayment(JSON.parse(event.body).PAYMENTS_ID);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
}

async function getPayment(PAYMENTS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'PAYMENTS_ID': PAYMENTS_ID
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getPayments() {
    const params = {
        TableName: dynamodbTableName
    }
    const allPayments = await scanDynamoRecords(params, []);
    const body = {
        payments: allPayments
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function savePayment(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Payment has been successfully saved.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function updatePayment(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Payment has been successfully updated.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function modifyPayment(PAYMENTS_ID, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'PAYMENTS_ID': PAYMENTS_ID
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Payment updated successfully.',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deletePayment(PAYMENTS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'PAYMENTS_ID': PAYMENTS_ID
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'User has been successfully deleted.',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin,Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Accept,Origi'	,
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(body)
    }
    
}