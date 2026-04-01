# Live Chat Server

Node.js backend using Express and Socket.IO.

It handles:

- WebSocket events: `send-message`, `edit-message`, `delete-message`, `send-intent`, etc.
- S3 presigned URL generation for text and image uploads
- Rate limiting and daily message caps
- Temporary in-memory storage of user messages (to be replaced with DynamoDB)
- Ownership checks for edits and deletes

## Setup

1. Install dependencies:

```bash
npm install
````

2. Configure environment variables:

```env
S3_BUCKET=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CDN_URL=your_cdn_url
PORT=3000
```

3. Run development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
node dist/index.js
```

## Notes

* Users are anonymous and assigned a new identity on each session.
* Messages are stored in S3 and deleted after 1 day using a lifecycle rule.
* The server does not store full message content in memory; only metadata is kept.
* Ownership checks prevent users from editing or deleting messages that are not theirs.
* DynamoDB integration is planned to replace in-memory metadata for persistence and history features.
