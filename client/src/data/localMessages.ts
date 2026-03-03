export const LocalMessages = {
    welcome: (username: string) => `
**Welcome, [\`@${username}\`](#welcome) 👋**

This is a public, **anonymous chat** where you can talk about anything, ask questions, or support others.  

### Guidelines
- **Be respectful** – No hate messages or NSFW content.  
- **No spam** – The chat has spam limits, so please avoid flooding the chat.  
- **Safe sharing** – You can attach images or GIFs (local or online).  
- **Enjoy yourself** – Have fun exploring and chatting!  

> ⚠️ Messages (and any attachments) are **completely anonymous** and **kept for 1 day only**.
 No cookies or personal data are stored. Your messages are **never collected, tracked, or used for AI or research purposes**.  
   
> 💡 **Tip:** Links in chat do **not open in a new tab by default!** 
 To open them safely, **hold Ctrl (or Cmd) and click**, or **right-click → Open in new tab**.  


Need help or want to contact the administrator? [Reach out here](https://mfarhanz.dev/contact)

Have fun! 😄
`,
    kicked: (reason: string | null) => `You were kicked: **${reason ?? "No reason provided"}**`,
    kick_warning: () => "_You're sending messages too quickly! Please wait a moment before sending another message to avoid being kicked._",
    disconnected: () => "You have been disconnected.",
    connection_error: (error: string) => `Error connecting to chat: **${error}**`,
    image_limit: () => "_You have reached the daily limit for sending media files. You can still send text messages._",
    server_limit: (downtime: number) => `_The chat server has reached its daily message limit. 
            To conserve costs, the chat is temporarily unavailable until the server comes back online in ${downtime} hour${downtime !== 1 ? "s" : ""}._`
}
