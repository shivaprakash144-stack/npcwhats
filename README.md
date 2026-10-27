# NPC WhatsApp Capture (evening scan)

Every evening: scan WhatsApp Web -> upload the file -> new numbers are added to a Google Sheet,
unless that number was already captured in the last 3 days.

Sheet header row (columns A to F):
Date/Time (IST) | Phone | Last 10 digits | Name / chat title | Last message | Note

## One-time setup
1. Neon database -> DATABASE_URL.
2. Google service account + Sheets API; share the sheet (tab "WhatsApp Numbers") with its email as Editor.
3. Push to GitHub, import in Vercel, add the variables from .env.example (including UPLOAD_PASSCODE), deploy.
4. Open the app, export the phone's contacts as .vcf and upload them (so saved names get their numbers).

## Every evening
1. web.whatsapp.com: chat filter on All, no archived chats. Press F12 > Console.
2. On the app page press "Copy scan script", paste it in the Console, press Enter. A file downloads.
3. Upload the file on the app page.

## Test
npm test

## Automatic version (recommended for the team): Chrome extension
Folder: extension/
1. Open extension/config.js, set APP_URL (your Vercel address) and PASSCODE (same as UPLOAD_PASSCODE).
2. On the computer that keeps WhatsApp Web open: Chrome > chrome://extensions > turn on Developer mode >
   Load unpacked > choose the extension folder.
3. Keep WhatsApp Web open and logged in. From 8 pm, when nobody is using the screen, it scans by itself
   (once a day) and the numbers appear in the sheet. A "Send today's numbers" button at the bottom left
   also runs it on demand.
It scans today's and yesterday's chats, so a missed evening is caught the next day.
The console script and upload page above are the manual backup.
