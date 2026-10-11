# Info Collector

**A complete browser-to-library workflow: capture articles, translate them into Chinese, and turn reading into a searchable personal knowledge archive.**
把散落的网页与书签，整理为中文译文、摘要、标签、阅读进度与每周回顾。

[Public reading desk](https://info-collector-reading-desk.jiligualapiqiu.chatgpt.site/) · [Windows setup](SETUP-WINDOWS.md) · [Design](docs/design.md) · [Engineering evidence](docs/ENGINEERING_AUDIT.md)

The engineering contribution is a file-based processing protocol that connects a Chrome extension, a Python Native Messaging host, independent processing flows, and a static reading desk. The extension owns queue state; versioned outbox/inbox messages carry jobs and completion reports; atomic writes and acknowledgements make repeated delivery idempotent. New processing types enter through a registry, so article handling can expand without rewriting the queue state machine. This contract turns browser capture and local scripts into one coherent application.

- **一键收集**：save visible article text from the current tab or import a chosen bookmark folder, with normalized URLs and deduplication across active and archived records.
- **快速读懂**：generate Chinese translations, summaries, and tags through the configured DeepSeek or Anthropic service; retain original links and resume long articles from segment checkpoints.
- **集中管理**：inspect processing state in the Dashboard; search, filter, favorite, and track reading progress in the reading desk.
- **持续沉淀**：save articles as local Markdown and generate a standalone HTML library with individual article pages, metadata, and source links.
- **高效回顾**：generate weekly reading reviews from completed summaries and tags, with topic groupings and a daily reading calendar; this step requires no additional model call.

The storage design uses **32 hash buckets** for compact active metadata, with completed records moving into a local archive as quota pressure rises. Source capture, translation, queue recovery, and publication remain separate stages. Workers classify failures, enforce a finite retry budget, preserve progress, and return actionable status to the Dashboard. Windows-protected credentials, validated source URLs, and hash-pinned worker commands support the local deployment. These mechanisms are documented in [four architecture decision records](docs/adr/), with implementations in [queue logic](extension/lib/queue.js), [the Native Host](host/info_collector_host.py), and [the translation worker](flows/translate-claude-api.py).

The project includes **14 Node/Python test files** covering queue transitions, import deduplication, codecs, host messaging, translation recovery, reader behavior, static generation, and weekly reports. Node runtime code and Python flows use built-in libraries. The [operations guide](docs/OPERATIONS.md) supplies release checks, failure-injection scenarios, and recovery procedures; `npm.cmd test` runs both language suites. The public reading desk is a generated snapshot of the same reading workflow.

## Install on Windows
Requires Windows 11, Google Chrome, Python 3.9+, and your own model API credentials. Article text is sent to the configured translation provider; Markdown archives stay on your machine.
```powershell
git clone https://github.com/130U/info-collector-2026.git
cd info-collector-2026
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```
Load `extension/` through `chrome://extensions`, then follow the [first-run guide](SETUP-WINDOWS.md). [Apache 2.0 license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
