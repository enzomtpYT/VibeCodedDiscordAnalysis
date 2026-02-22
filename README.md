# 📊 Discord Chat Analyzer

VibeCoded Discord Analysis is a sleek, private, and local-first tool to visualize your Discord conversation history. See who talks the most, who initiates conversations, response times, and more.

## 🚀 Getting Started

To use this tool, you need to export your Discord chat data into a **CSV** format.

### 1. Download Discord Chat Exporter
The most reliable tool for this is **DiscordChatExporter** by Tyrrrz.
*   **Download Link:** [GitHub - DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter)
*   **How to get your Token:** Follow the guide on their GitHub page to safely retrieve your Discord token (User or Bot).

### 2. Export your Chat Data
1.  Open **DiscordChatExporter**.
2.  Log in using your token.
3.  Select the channel or DM you want to analyze.
4.  **Important:** In the "Export Format" dropdown, select **`CSV`**.
5.  Click **Export** and save the file to your computer.

### 3. Analyze with VibeCoded
1.  Open `index.html` in any modern web browser (Chrome, Firefox, Edge).
2.  Click on the upload area or "Browse Files".
3.  Select the `.csv` file you exported in the previous step.
4.  Enjoy your beautifully visualized chat stats!

## 🔒 Privacy First
*   **Local Processing:** All calculations are performed directly in your browser.
*   **No Uploads:** Your chat data **never** leaves your computer. We do not use any backend or cloud storage.
*   **Open Source:** The entire logic is in `index.html` for you to inspect.

## ✨ Features
*   **Message Distribution:** See the percentage of messages per user.
*   **Interaction Starters:** Track who initiates chats after long breaks.
*   **Response Times:** Average wait time before a reply.
*   **Activity Heatmaps:** Messages by hour of the day and day of the week.
*   **Timeline:** See activity trends over months or years.
*   **Word Analytics:** Most frequently used words (with common stop-words filtered).

## 💡 Pro Tips
*   **Filter Bots:** Before uploading, check the "Exclude bots" box if you only want to see stats for real users (this filters out names like `BotName#1234`).
*   **Large Files:** For very large chat logs, the tool may take a few seconds to process. Please be patient!
*   **Export Ranges:** In DiscordChatExporter, you can select specific date ranges to analyze a particular month or year.
