# Info Collector

**Turn saved articles into a searchable Chinese reading library.**

把散落在网页和书签里的内容，整理为中文译文、摘要、标签和可回顾的 Markdown 归档。

[公开阅读快照](https://info-collector-reading-desk.jiligualapiqiu.chatgpt.site/) · [Windows 安装](SETUP-WINDOWS.md) · [使用与运维](docs/OPERATIONS.md)

## 从采集到回顾

- **一键收集**：保存当前网页可见正文，或从指定 Chrome 书签文件夹批量导入文章。
- **快速读懂**：通过配置的模型服务生成中文译文、摘要和标签，保留原文链接。
- **集中管理**：在 Dashboard 查看处理状态，在阅读桌搜索、筛选、收藏并标记阅读进度。
- **持续沉淀**：把译文保存为本地 Markdown，生成带目录的静态阅读库。
- **高效回顾**：按已完成文章的摘要与标签生成本周阅读回顾，无需再次调用模型。

## 本地安装

支持 Windows 11、Google Chrome 和 Python 3.9+；翻译需要自己的 DeepSeek 或 Anthropic API 凭据，正文会发送给配置的模型服务。

```powershell
git clone https://github.com/130U/info-collector-2026.git
cd info-collector-2026
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

安装后，在 Chrome 的 `chrome://extensions` 加载本仓库的 `extension` 文件夹，按[安装指南](SETUP-WINDOWS.md)完成首次采集与处理。文章归档保存在本机；活跃队列元数据使用 Chrome 同步存储。在线阅读桌展示公开静态快照；macOS/Linux 与播客脚本保留为开发工具。
