"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadUrl = createUploadUrl;
exports.putMessage = putMessage;
exports.getMessagesBySocket = getMessagesBySocket;
exports.getLatestMessages = getLatestMessages;
exports.deleteMessage = deleteMessage;
exports.deleteMessagesBySocket = deleteMessagesBySocket;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const config_1 = require("./config");
const s3 = new client_s3_1.S3Client({
    region: config_1.AWS_REGION,
    ...(process.env.NODE_ENV === "production" ? {} : {
        credentials: {
            accessKeyId: config_1.AWS_ACCESS_KEY_ID,
            secretAccessKey: config_1.AWS_SECRET_ACCESS_KEY,
        }
    })
});
const client = new client_dynamodb_1.DynamoDBClient({
    region: config_1.AWS_REGION,
    ...(process.env.NODE_ENV === "production" ? {} : {
        credentials: {
            accessKeyId: config_1.AWS_ACCESS_KEY_ID,
            secretAccessKey: config_1.AWS_SECRET_ACCESS_KEY,
        }
    })
});
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
async function createUploadUrl(key, mime) {
    const command = new client_s3_2.PutObjectCommand({
        Bucket: config_1.S3_BUCKET,
        Key: key,
        ContentType: mime
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, {
        expiresIn: 60 // in seconds
    });
    return url;
}
async function putMessage({ socketId, messageId, createdAt, textId, imageIds, channelId = "global", }) {
    await dynamo.send(new lib_dynamodb_1.PutCommand({
        TableName: config_1.DYNAMODB_TABLE,
        Item: {
            socketId,
            createdAt,
            messageId,
            textId: textId ?? null,
            imageIds: imageIds ?? null,
            channelId,
            ttl: Math.floor(createdAt / 1000) + config_1.DYNAMODB_TTL_SECONDS,
        }
    }));
}
async function getMessagesBySocket(socketId) {
    const result = await dynamo.send(new lib_dynamodb_1.QueryCommand({
        TableName: config_1.DYNAMODB_TABLE,
        KeyConditionExpression: "socketId = :s",
        ExpressionAttributeValues: { ":s": socketId },
    }));
    return result.Items ?? [];
}
async function getLatestMessages(channelId = "global", limit = 10) {
    const result = await dynamo.send(new lib_dynamodb_1.QueryCommand({
        TableName: config_1.DYNAMODB_TABLE,
        IndexName: config_1.DYNAMODB_GSI,
        KeyConditionExpression: "channelId = :c",
        ExpressionAttributeValues: { ":c": channelId },
        ScanIndexForward: false, // newest first
        Limit: limit,
    }));
    return result.Items ?? [];
}
async function deleteMessage(socketId, messageId) {
    await dynamo.send(new lib_dynamodb_1.DeleteCommand({
        TableName: config_1.DYNAMODB_TABLE,
        Key: {
            socketId,
            messageId,
        }
    }));
}
// safe batched deletion method
async function deleteMessagesBySocket(socketId) {
    let lastEvaluatedKey = undefined;
    do {
        // explicity typed
        const result = await dynamo.send(new lib_dynamodb_1.QueryCommand({
            TableName: config_1.DYNAMODB_TABLE,
            KeyConditionExpression: "socketId = :s",
            ExpressionAttributeValues: { ":s": socketId },
            ProjectionExpression: "messageId",
            ExclusiveStartKey: lastEvaluatedKey,
        }));
        // type cast to extract only messageId
        const items = (result.Items ?? []).map(i => ({
            socketId: socketId,
            messageId: i.messageId
        }));
        if (items.length === 0)
            break;
        for (let i = 0; i < items.length; i += 25) {
            const chunk = items.slice(i, i + 25);
            // Set up request object with explicit typing for the RequestItems
            let requestItems = {
                [config_1.DYNAMODB_TABLE]: chunk.map((msg) => ({
                    DeleteRequest: { Key: msg }
                }))
            };
            // for handling unprocessed items
            while (requestItems && requestItems[config_1.DYNAMODB_TABLE] && requestItems[config_1.DYNAMODB_TABLE].length > 0) {
                const batchResult = await dynamo.send(new lib_dynamodb_1.BatchWriteCommand({
                    RequestItems: requestItems
                }));
                // Update requestItems for the next iteration if there are leftovers
                if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
                    requestItems = batchResult.UnprocessedItems;
                }
                else {
                    break;
                }
            }
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
}
