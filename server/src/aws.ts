import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand,
    QueryCommandOutput, BatchWriteCommandOutput, BatchWriteCommand
} from "@aws-sdk/lib-dynamodb";
import { S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DYNAMODB_TABLE, DYNAMODB_TTL_SECONDS, DYNAMODB_GSI } from "./config";
import { MessageKey } from "./types/meta";

const s3 = new S3Client({
    region: AWS_REGION,
    ...(process.env.NODE_ENV === "production" ? {} : {
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID!,
            secretAccessKey: AWS_SECRET_ACCESS_KEY!,
        }
    })
});

const client = new DynamoDBClient({
    region: AWS_REGION,
    ...(process.env.NODE_ENV === "production" ? {} : {
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID!,
            secretAccessKey: AWS_SECRET_ACCESS_KEY!,
        }
    })
});

const dynamo = DynamoDBDocumentClient.from(client);

export async function createUploadUrl(key: string, mime: string) {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: mime
    });

    const url = await getSignedUrl(s3, command, {
        expiresIn: 60 // in seconds
    });

    return url;
}

export async function putMessage({
    socketId,
    messageId,
    createdAt,
    textId,
    imageIds,
    channelId = "global",
}: {
    socketId: string;
    messageId: string;
    createdAt: number;
    textId?: string | null;
    imageIds?: string[] | null;
    channelId?: string;
}) {
    await dynamo.send(new PutCommand({
        TableName: DYNAMODB_TABLE,
        Item: {
            socketId,
            createdAt,
            messageId,
            textId: textId ?? null,
            imageIds: imageIds ?? null,
            channelId,
            ttl: Math.floor(createdAt / 1000) + DYNAMODB_TTL_SECONDS,
        }
    }));
}

export async function getMessagesBySocket(socketId: string) {
    const result = await dynamo.send(new QueryCommand({
        TableName: DYNAMODB_TABLE,
        KeyConditionExpression: "socketId = :s",
        ExpressionAttributeValues: { ":s": socketId },
    }));
    return result.Items ?? [];
}

export async function getLatestMessages(channelId = "global", limit = 10) {
    const result = await dynamo.send(new QueryCommand({
        TableName: DYNAMODB_TABLE,
        IndexName: DYNAMODB_GSI,
        KeyConditionExpression: "channelId = :c",
        ExpressionAttributeValues: { ":c": channelId },
        ScanIndexForward: false, // newest first
        Limit: limit,
    }));
    return result.Items ?? [];
}

export async function deleteMessage(socketId: string, messageId: string) {
    await dynamo.send(new DeleteCommand({
        TableName: DYNAMODB_TABLE,
        Key: {
            socketId,
            messageId,
        }
    }));
}

// safe batched deletion method
export async function deleteMessagesBySocket(socketId: string) {
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
        // explicity typed
        const result: QueryCommandOutput = await dynamo.send(new QueryCommand({
            TableName: DYNAMODB_TABLE,
            KeyConditionExpression: "socketId = :s",
            ExpressionAttributeValues: { ":s": socketId },
            ProjectionExpression: "messageId",
            ExclusiveStartKey: lastEvaluatedKey,
        }));

        // type cast to extract only messageId
        const items: MessageKey[] = (result.Items ?? []).map(i => ({
            socketId: socketId,
            messageId: i.messageId as string
        }));
        if (items.length === 0) break;

        for (let i = 0; i < items.length; i += 25) {
            const chunk = items.slice(i, i + 25);

            // Set up request object with explicit typing for the RequestItems
            let requestItems: BatchWriteCommand["input"]["RequestItems"] = {
                [DYNAMODB_TABLE]: chunk.map((msg) => ({
                    DeleteRequest: { Key: msg }
                }))
            };

            // for handling unprocessed items
            while (requestItems && requestItems[DYNAMODB_TABLE] && requestItems[DYNAMODB_TABLE].length > 0) {
                const batchResult: BatchWriteCommandOutput = await dynamo.send(new BatchWriteCommand({
                    RequestItems: requestItems
                }));

                // Update requestItems for the next iteration if there are leftovers
                if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
                    requestItems = batchResult.UnprocessedItems;
                } else {
                    break;
                }
            }
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
}
