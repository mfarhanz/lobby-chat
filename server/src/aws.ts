import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from "./config";

const s3 = new S3Client({
    region: AWS_REGION,
    ...(process.env.NODE_ENV === "production" ? {} : {
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID!,
            secretAccessKey: AWS_SECRET_ACCESS_KEY!,
        }
    })
});

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
