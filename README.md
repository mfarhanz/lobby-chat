# LobbyChat

[LobbyChat](https://lobbychat.pages.dev) is an anonymous chat site that primarily uses Websockets for its underlying client-server communication. This repository holds the source code for both its current backend and frontend. While the source is freely available, hosting and deployment configuration can be modifiable as per developer's wishes - the currently [deployed site](https://chat.mfarhanz.dev) uses Cloudflare Pages and AWS for hosting.

## Table of Contents

- [LobbyChat](#lobbychat)
  - [Table of Contents](#table-of-contents)
  - [Design](#design)
  - [Structure](#structure)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Usage](#usage)
  - [License](#license)

## Design  

It's design is more so of a cost effective live streaming chat, preserving user anonymity without the need to create user accounts, using a specifically set backend configuration. As such, the stored state of a user's chat session is ephemeral - it is lost if the user reloads the site or does something similar to reset the current website cache.
  
Key features include:

- Single global 'channel'

- Users list panel with basic info about connected clients

- Standard chat operations - message sending/deletes/edit/reply/reactions/copying

- Automated 'system' messages to notify user about any warnings/alerts

- Media uploads support, with automated file compression

- Minimalist, Discord like UI

- Rate limiting, IP monitoring, CSRF/XSS protection, CORS config  

## Structure

The main code is split into:

- `client/` – React/TailwindCSS based frontend
- `server/` – Node.js backend with Socket.io/Express  

## Prerequisites  

This project uses Node.js, which must be installed from [here](https://nodejs.org/en/download).  
All other dependencies can then be installed easily via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), which gets installed alongside the default node.js installation.  
Verify if `npm` and `node` are installed with `npm -v` and `node -v` in the terminal.

## Install  

- `git clone https://github.com/mfarhanz/lobby-chat.git` or download and extract it from a zip file to get the current repository content  
- Run `npm install` in both the `client/` and `server/` directories  

## Usage  

Run the development server and host the frontend client by doing the following in both the `client/` and `server/` directories:  

```bash
npm run dev
```

Run the client production server by doing:  

```bash
npm run build
npm run preview
```

And the node.js server by doing:

```bash
npm run build
npm run preview
```

The client side by default is using HTTPS on the dev server by using the [`@vitejs/plugin-basic-ssl`](https://www.npmjs.com/package/@vitejs/plugin-basic-ssl) package - this can be disabled if needed by commenting out `basicSsl` in `client/vite.config.ts`.  

It is also serving as the host by default, to allow testing the site on other local devices - this can be toggled off by commenting out `host: true` in `client/vite.config.ts`.  

Logging is incorporated into the server side - check the `server/logs/` folder for reviewing any log files.

## License

[MIT](https://github.com/mfarhanz/lobby-chat/blob/main/LICENSE)
