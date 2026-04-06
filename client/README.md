# LobbyChat Client

[React](https://react.dev/learn)/[Typescript](https://www.typescriptlang.org/) and [TailwindCSS](https://tailwindcss.com/) based frontend for LobbyChat, with [Vite](https://vite.dev/) for build tooling and ESLint for linting.  

The currently deployed site is hosted via Cloudflare Pages, but can be hosted with other [PaaS providers](https://freestuff.dev/alternative/cloudflare-pages/).

It handles:

- Sending and receiving messages via WebSockets
- Uploading text and images to S3
- Rendering messages, edits, replies, and images
- Basic rate-limiting feedback for users
- Dark/light mode toggle

## Table of Contents

- [LobbyChat Client](#lobbychat-client)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Structure](#structure)
  - [Setup](#setup)
  - [Configuration](#configuration)
  - [Notes](#notes)
  - [TODO](#todo)

## Features  

- Discord like, minimalist UI with a chat panel and users panel
- Easily configurable theming
- Responsive, dynamic components using tailwind classes
- Live UI updates during any delete/edit/add-reaction/disconnect/connect events
- System-user interaction via 'system' style auto generated messages
- Emoji pickers (drawers for mobile views)
- Message replying and pinging chat users
- Supports uploading or embedding local/online images/GIFs
- Image/GIFs compressed automatically via [`pica`](https://github.com/nodeca/pica) and [`ffmpeg`](https://ffmpegwasm.netlify.app/docs/overview)
- Lag free UI due to using [`react-window`](https://react-window.vercel.app/how-does-it-work) under the hood
- Smooth animations and transitions with [`motion`](https://motion.dev/)
- Markdown support in chat messages  

## Structure

```markdown
client
├── node_modules              // npm packages
├── public                    // files publicly accessible
│   ├── favicon.ico           // site icon
│   ├── preview.webp          // social media preview image
│   ├── robots.txt            // allow/deny bots to scrape
│   └── sitemap.xml           // for SEO
├── src
│   ├── assets                // contains any blob/media/files utilized in code
│   ├── components            // react component files
│   ├── constants             // numeric constants that set the client side chat config
│   ├── data                  // string constants/messages
│   ├── hooks                 // custom react hooks
│   ├── styles                // custom css/theme files
│   ├── types                 // types/interfaces for response/requests/contructors/method params
│   ├── utils                 // files for utility functions
│   ├── App.css               // default css
│   ├── App.tsx               // main site body
│   ├── index.css             // main css file
│   └── main.tsx              // default react entry
├── .env                      // environment variables
├── .gitignore
├── eslint.config.js
├── index.html                // root html code, contains seo tags
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js        // tailwind config, can be customized/extended
├── tsconfig.app.json         // typescript src/browser config
├── tsconfig.json
├── tsconfig.node.json        // typescript node env config
└── vite.config.ts            // vite config
```

## Setup

1. Install dependencies:

```bash
npm install
````

1. Create `client/.env` with required environment variables:

```env
VITE_SOCKET_URL=your_deployed_backend_url
VITE_CLOUDFRONT_URL=your_cdn_url
VITE_TURNSTILE_SITEKEY=cloudflare_turnstile_public_key
```

1. To run the development server:

```bash
npm run dev
```

1. To run the production build:

```bash
npm run build
npm run preview
```

## Configuration  

The chat configuration is currently defined in the [`client/src/constants/chat.ts`](https://github.com/mfarhanz/lobby-chat/blob/main/client/src/constants/chat.ts) file. Some of these attritbutes must match their corresponding counterparts on the server side config. The `.env` file is primarily for info, as the user would need to specify the corresponding environment variables and secrets individually while deploying onto their chosen platform.  

The default Vite configuration is defined in [`client/vite.config.ts`](https://github.com/mfarhanz/lobby-chat/blob/main/client/vite.config.ts), and by default allows the user to test the site on local (LAN) devices once the dev server is started - this can toggled by setting `host: false`. Optionally, the site is served on the dev server via HTTPS by using `basicSsl` for testing purposes - this can commented or toggled out if needed.

The Tailwind configuration can be adjusted in [`client/tailwind.config.js`](https://github.com/mfarhanz/lobby-chat/blob/main/client/tailwind.config.js) if needed - see [`here`](https://v2.tailwindcss.com/docs/configuration) for more info on configuring Tailwind. The chat site's theme colors can be configured as per users wishes in [`client/src/styles/themes.css`](https://github.com/mfarhanz/lobby-chat/blob/main/client/src/styles/themes.css).

By default, all code imports in .ts/.js/.tsx/.jsx files follow [ESM syntax](https://www.w3schools.com/nodejs/nodejs_modules_esm.asp) instead of CommonJS.

## Notes

- The chat has been designed to be ephemeral with no message persistence, so on page reload/refresh, chat users will not see any previous messages/history.
- Messages are rendered in [`client/src/components/Chat.tsx`](https://github.com/mfarhanz/lobby-chat/blob/main/client/src/components/Chat.tsx) via a `messages` state variable - the chat effectively renders this list of messages, and chat operations modify this list.
- The bulk of socket events handling logic (as well as the management of the `messages` state) is in the [`client/src/hooks/useChat.ts`](https://github.com/mfarhanz/lobby-chat/blob/main/client/src/hooks/useChat.ts) hook, with socket events defined in the [`client/src/types/socket.ts`](https://github.com/mfarhanz/lobby-chat/blob/main/client/src/types/socket.ts) file. This can be extended if needed by following a similar pattern to the existing handlers.
- Edits and deletes are reflected immediately in the UI but do not update the S3 instance - objects in S3 are currently only needed for caching once on the client side, to update their built-in `messages` state. Objects stored in S3 are automatically purged via lifecycle rules.
- Edits, deletes and client disconnections do get reflected on the DynamoDB instance, as the database is primarily used for verifying and checking the up-to-date IDs, hashes and timestamps of messages and their owners. If a user disconnects, all entries related to them in DynamoDB are purged; their messages in chat stay as is for all other users.
- While the client code does some minimal checks before emitting socket events, the main validation logic is all on the server side.
- In case of any warnings (eg. rate limiting cautions, daily message sending limits), the chat notifies this to the current user via automatic messages sent in chat, viewable only by the user.  

## TODO
