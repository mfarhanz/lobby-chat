"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadUrl = createUploadUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
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
