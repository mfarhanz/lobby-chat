# Live Chat Client

This is the frontend of the chat app. Built with React, TypeScript and TailwindCSS.

It handles:

- Sending and receiving messages via WebSocket
- Uploading text and images to S3
- Rendering messages, edits, replies, and images
- Basic rate-limiting feedback for users
- Dark/light mode toggle

## Setup

1. Install dependencies:

```bash
npm install
````

2. Configure environment variables:

```env
REACT_APP_API_URL=your_backend_url
REACT_APP_CDN_URL=your_cdn_url
```

3. Run development server:

```bash
npm start
```

4. Build for production:

```bash
npm run build
```

## Notes

* Messages are stored temporarily in the frontend state.
* Edits and deletes are reflected immediately in the UI but do not update S3 yet.
* Client does basic checks to avoid empty or unchanged edits.
* Future DynamoDB integration will allow fetching recent messages on join.
