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
    kicked: (reason: string | null) => `You were kicked: **${reason ?? "~~no reason really lol~~"}**`,
    disconnected: () => `You have been disconnected.`,
    connection_error: (error: string) => `Error connecting to chat: **${error}**`,
}