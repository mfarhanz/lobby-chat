# Live Chat

Source code for [Live Chat](https://lobbychat.pages.dev), an anonymous chat site that primarily uses Websockets for its underlying client-server communication.  

It's design is more so of a live streaming chat, preserving user anonymity without the need to create user accounts. As such, the stored state of a user's chat session is ephemeral - it is lost if the user reloads the site or does something similar to reset the current website cache.

The main code is split into:

- `client/` – React/TailwindCSS based frontend
- `server/` – Node.js backend with Socket.io/Express
