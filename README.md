# Info Collector

**Turn saved articles into a Chinese reading library you can search, revisit, and keep.**

[Open the reading desk](https://info-collector-reading-desk.jiligualapiqiu.chatgpt.site/) · [Windows setup](SETUP-WINDOWS.md)

Info Collector connects the moment you save an article with the moment you read it again. A Chrome extension captures pages and bookmarks; local processing turns them into Chinese translations, summaries, and tags; a reading desk brings the collection together.

- **Collect**: save the visible text of the current page or import a chosen bookmark folder. Repeated saves are deduplicated.
- **Understand**: read a Chinese translation with a short summary, topic tags, and a link back to the original.
- **Organize**: search and filter your collection, favorite useful articles, and keep track of reading progress.
- **Keep**: store articles as local Markdown and generate a standalone reading site you can open without a server.
- **Review**: create a weekly recap from completed summaries and tags, without another model call.

The library remains useful beyond any one reading session: Markdown files stay on your machine, and the reading site can be regenerated from them. Long translations resume from saved checkpoints, while the Dashboard shows which items need attention. The public reading desk is a static snapshot of this workflow.

## Install on Windows

Requires Windows 11, Google Chrome, Python 3.9+, and your own DeepSeek or Anthropic API credentials. Article text is sent to your configured translation provider.
```powershell
git clone https://github.com/130U/info-collector-2026.git
cd info-collector-2026
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```
Load `extension/` in `chrome://extensions`, then follow the [first-run guide](SETUP-WINDOWS.md).
[Design](docs/design.md) · [Operations](docs/OPERATIONS.md) · [Apache 2.0 license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
