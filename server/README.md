# LobbyChat Server

Node.js backend for LobbyChat, using [Express](https://expressjs.com/) and [Socket.IO](https://socket.io/), with [Vite](https://vite.dev/) for build tooling and ESLint for linting.  

It is recommended to use AWS for backend hosting since this code has been designed for use with [AWS EC2](https://aws.amazon.com/ec2/) and other AWS services. However, one may choose other hosting providers/VM services as well - you would mostly need to adjust the `env` variables accordingly. The currently [deployed site](https://lobbychat.pages.dev/) is hosted on a t3.nano EC2 instance running Ubuntu 22.04 LTS.

## Table of Contents

- [LobbyChat Server](#lobbychat-server)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Structure](#structure)
  - [Setup](#setup)
  - [Configuration](#configuration)
  - [Hosting](#hosting)
  - [Notes](#notes)  

## Features  

- Utilizes Websockets for transmitting/broadcasting events to chat like 'send-message', 'edit-message', 'delete-message', 'add-reaction', 'disconnect', etc.
- Follows a 'double handshake' protocol with S3 cloud storage for sending messages, to be cost effective
- Provides presigned S3 URLs to clients for uploading text/images to S3, served via Cloudfront URLs
- Rate limiting and daily message/uploads caps for both server and users
- Users metadata stored in a combination of in-memory cache and DynamoDB
- Proper ownership checks for all events
- Daily logging with automatic log file maintenance using [`winston-daily-rotate-file`](https://www.npmjs.com/package/winston-daily-rotate-file)
- Automatic cleanup of DynamoDB and cached records on client disconnection
- Cloudflare Turnstile based bot protection
- Easily confgurable chat contraints via `config.ts`
- Can be extended by simply adding more socket handlers

## Structure  

```markdown
server
├── dist                      // build files
├── logs                      // log directory
├── node_modules              // npm packages
├── src
│   ├── types
│   │   └── meta.ts           // types/interfaces defining responses/requests
│   ├── aws.ts                // aws related methods (for s3, dynamodb)
│   ├── config.ts             // server configuration file
│   ├── constants.ts          // string constants/messaages
│   ├── index.ts              // main server logic
│   └── logger.ts             // minimal logging setup
├── .env                      // environment variables
├── .gitignore
├── artillery.yml             // for load testing with artillery.js
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json             // typescript config
```

## Setup

1. Install dependencies:

```bash
npm install
````

1. Create `server/.env` with required environment variables:

```env
PORT=3000
CLIENT_DEPLOYMENT_URL=your_deployed_frontend_site
TURNSTILE_SECRET=optional_cloudflare_turnstile_secret_key

AWS_ACCESS_KEY_ID=your_custom_aws_iam_user_access_key_id
AWS_SECRET_ACCESS_KEY=your_custom_aws_iam_user_secret_key
AWS_REGION=aws_region_you_are_deploying_in

S3_BUCKET=your_aws_s3_bucket_name
DYNAMODB_TABLE=your_aws_dynamodb_table_name
DYNAMODB_GSI=your_dynamodb_table_global_secondary_index_name
```

1. Run development server:

```bash
npm run dev
```

1. If you'd like to run the production server:

```bash
npm run build
node dist/index.js
```

## Configuration  

The server can be configured according to your chat's requirements/contraints by editing the attributes in [`server/src/config.ts`](https://github.com/mfarhanz/lobby-chat/blob/main/server/src/config.ts). Ensure that your `server/.env` file is correctly set up for the required variables in `config.ts`.  

Adjusting these attribute values directly corresponds to setting the upper threshold (in the worst case) for the server's monthly hosting bill, whether on AWS or any other provider. The current default configuration (set up for AWS hosting) ensures a maximum of $10 a month, provided the AWS services being utilized (EC2 - t3.nano, S3, DynamoDB, Cloudfront Flate Rate Plan, all hosted on us-east-2) are all using the basic default features.

## Hosting  

The currently deployed site's `server/` is hosted on an AWS EC2 t3.nano instance with 0.5GB of RAM, 8GB of storage, and 2 vCPUs, and is more than capable of handling 200 concurrent users with the current configuration of the backend. This can be scaled higher by using better instances - I had to chose the most basic yet most capable machine I could find to limit costs.

After setting up the virtual server, the user would have to install, setup and configure [nginx](https://nginx.org/) and [pm2](https://pm2.keymetrics.io/) to allow the server to serve content/requests via HTTPS, as well as for security and load balacing (if using multiple virtual machines). PM2 ensures the server is always running/available without needing the user/administrator to manually restart the node process for the server if it shuts down.

## Notes

- Users are essentially anonymous since they are assigned a new identity on each session. This means even if a users chooses the same username on page refresh/reload, their internal userId will always be brand new.
- [Discriminators](https://discord.fandom.com/wiki/Discriminator) are used internally to differentiate between users with the same usernames.
- Messages (both the textual content and any image/GIF uploads) are stored in an [S3 bucket](https://aws.amazon.com/s3/pricing/) and deleted after 1 day using a lifecycle rule.
- To further reduce data-transfer-out costs, content from S3 is served via a [CDN](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) (in this case, a [flat rate Cloudfront](https://aws.amazon.com/cloudfront/pricing/) instance).
- Server issues only presigned S3 URLs after validating upload files, with a set expiry time, to avoid bad actors from uploading anything they wish to S3.
- The actual message data is not transmitted between server and client, only metadata. The server gives clients the 'go-ahead' to upload their message data to online storage before broadcasting the link to the stored message; the clients then access the new message via the CDN. This helps to greatly reduce the data-transfer-out (egress) related costs.
- Minimal (session based) metadata per client is stored in in-memory caches that are cleaned up on client disconnections/every midnight, while persistent metadata is stored in a cloud database (currently on a DynamoDB on-demand instance).
- Ownership checks prevent users from editing or deleting messages that are not theirs.
- Setting up the cloud database, key-value store, CDN, IAM role(s)/user(s) and associated policies is up to the user, dependent on the [CSP](https://cloud.google.com/learn/what-is-a-cloud-service-provider#:~:text=The%20CSP%20market,DigitalOcean%2C%20and%20Rackspace.) chosen for hosting.
- The `artillery` package is included in the installed packages, for local [load testing](https://www.artillery.io/docs/get-started/first-test) if needed. A minimal default `artillery.yml` file has been included which can be run via doing `artillery run artillery.yml`.
