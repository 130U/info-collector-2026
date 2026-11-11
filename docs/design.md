# Article Queue Extension — 设计

本文描述系统的总体设计。领域语言见 [CONTEXT.md](CONTEXT.md)，模块结构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 总体架构

系统组件与 Windows 安装结构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

三个角色：

1. **扩展**（MV3）：队列的唯一事实来源。从书签文件夹只读导入，
   维护每篇文章按 Processing Type 分桶的状态，提供 Dashboard 管理界面。
2. **Native host**（`host/info_collector_host.py`）：哑文件搬运工。扩展通过
   Native Messaging 调它，它负责把待处理清单写到 outbox、把 inbox 里的
   Completion Report 读回来。不含业务逻辑。
3. **外部处理流**：普通本机脚本（如 translate 流）。只跟
   `~/.info-collector/` 文件打交道，完全不需要知道 Chrome 的存在。

## 设计约定

| 约定 | 实现 |
|---|---|
| 事实来源 | 扩展自有存储，书签只是导入源 |
| 书签写权限 | 不写入书签，manifest 只读 |
| Processing Type | `translate` 是文章翻译类型，类型由注册表定义 |
| 外部流集成方式 | 文件 spool 契约 + Native Messaging 桥 |
| sync 存储布局 | 分桶存储 + local 归档 |
| URL 归一化 | 小写协议/主机、去 hash、保留 utm_* |
| Toolbar 直接保存 | popup 一键入队当前标签页 |
| Dashboard | 扩展内页面（chrome-extension://…/dashboard.html） |
| 立即触发流程 | host + flows.json 命令注册表，Dashboard「▶ 立即处理」 |

## 数据模型

### Queue Record（内存中的完整形态）

```js
{
  articleKey: "https://example.com/post",   // 归一化 URL，即身份
  url: "https://example.com/post",          // 原始（或首见）URL
  title: "Post title",
  sources: [
    { kind: "bookmark", folderName: "收藏文章", bookmarkId: "123", importedAt: "…" },
    { kind: "manual",   importedAt: "…" },          // toolbar 保存
    { kind: "report",   importedAt: "…" }           // Completion Report 先于导入到达
  ],
  jobs: {
    translate: { status: "pending", processedAt: null, updatedAt: "…",
                 attempts: 0, lastError: null, meta: {} }
  },
  createdAt: "…",
  updatedAt: "…"
}
```

- `jobs.<type>.status` ∈ `pending | processing | done | failed | ignored`。
- `processing` 是外部流的**认领**：流程启动时先写一份 claim 报告（status
  `processing`），扩展应用后显示「处理中」，且不再进 outbox（防重复认领）。
  桥接时若发现流程未在运行（锁探测）却仍有 processing 文章，自动回退
  pending——流程崩溃自愈，不计失败次数。
- `failed` 表示外部流报告失败，仍会出现在 outbox 里等待重试（attempts 递增）。
- `ignored` 是用户在 Dashboard 主动排除，不进 outbox。
- Completion Report 提到的未知 articleKey 会**创建** done 记录（source kind
  `report`），保证「书签先删了、处理历史也不丢」。

### Processing Type 注册表（meta）

```js
{
  version: 1,
  settings: { folders: ["收藏文章"] },
  types: {
    translate: { label: "翻译", autoEnroll: true, createdAt: "…" }
  }
}
```

- `autoEnroll: true` 的类型：新文章入队时自动建 pending job。
- 未来的 `transcript`、`book` 等流：在 Dashboard 设置里加一条注册即可，
  outbox 会自动多出对应文件。是否 autoEnroll 由该流的语义决定。

### URL 归一化（articleKey 推导）

保守策略，先不做激进清洗：

1. 小写 protocol 与 hostname；
2. 去掉 hash fragment；
3. 去掉默认端口（:80/:443）；
4. 空路径归一为 `/`（`https://a.com` ≡ `https://a.com/`），其余路径的尾斜杠**保留原样**；
5. 保留全部 query 参数（含 `utm_*`，除非用户以后明确要去）。

## 存储布局

- `chrome.storage.sync`：活跃记录，32 个桶键 `aq:b:00`…`aq:b:1f`
  （articleKey 的 FNV-1a hash 取模），桶内是 articleKey → 压缩记录的 map；
  `aq:meta` 存注册表和设置。压缩编码（短字段名）由 `codec.js` 负责，
  读写两侧只见完整形态。
- `chrome.storage.local`：`aq:archive` 归档记录、`aq:acks` 待发送的报告 ack、
  `aq:runs` 导入/桥接运行状态、`aq:flows` 各流程运行状态缓存。
- 归档触发：所有 job 均为 done/ignored 且 30 天未更新，或 sync 用量超 80% 时
  从最旧的已完成记录开始迁移。导入去重同时查活跃桶和归档。

## Spool 文件契约

根目录 `~/.info-collector/`：

```
outbox/<type>.json         扩展写（经 host），外部流读。该类型全部 pending 文章。
inbox/<uuid>.json          外部流写，扩展读（经 host）。Completion Report。
inbox/processed/           扩展确认（ack）后 host 把报告移到这里留痕。
flows.json                 流程注册表（setup 写入）：type → {command, lockFile,
                           intervalSeconds, label}。host 据此触发流程与探测运行状态。
state/<type>-status.json   流程自己维护的运行状态：lastRun{startedAt, trigger,
                           outcome…} 与 lastScheduledStartAt（估算下次定时运行用）。
state/<type>-trigger.log   手动触发的流程输出。
```

**outbox/translate.json**

```json
{ "processingType": "translate", "generatedAt": "…",
  "articles": [ { "articleKey": "…", "url": "…", "title": "…", "enqueuedAt": "…" } ] }
```

**inbox 报告**（文件名即 reportId，写入必须先写临时文件再 rename）

```json
{ "reportId": "translate-20260705T120000-ab12", "processingType": "translate",
  "results": [ { "url": "…", "status": "done", "processedAt": "…", "meta": {} } ] }
```

- 扩展按归一化 URL 匹配记录；`status` ∈ `done | failed`。
- 双向都用「临时文件 + rename」原子写，避免读到半个文件。
- 应用报告 → 下次桥接会话发送 ack → host 把报告文件移入 `processed/`。
  在 ack 之前重复读到同一报告是幂等的（done 覆写 done 无副作用）。

## 桥接节奏

- `chrome.alarms`：`import`（30 分钟）扫描书签文件夹；`bridge`（10 分钟）
  与 host 做一次同步会话。Dashboard 上有手动「立即导入 / 立即同步」按钮。
- 桥接会话：connectNative → 发送 `sync`（携带各类型 outbox 内容 + 上次
  已应用报告的 ack）→ host 写 outbox、移走已 ack 报告、返回 inbox 新报告
  与各流程运行状态 → 扩展应用 → 断开。
- 立即触发：Dashboard 待处理行的「▶ 立即处理」= 先桥接刷新
  outbox，再发 `trigger` 让 host 按 flows.json 启动该类型流程（队列级，
  会处理该类型全部待处理文章），随后安排 3/8 分钟后的跟进桥接尽快收报告。
  状态区显示各流程：运行中 / 上次结果（手动或定时）/ 预计下次定时运行时间
  （由 `lastScheduledStartAt + intervalSeconds` 推算，手动触发不污染锚点）。

## 翻译流的两个实现

`flows/` 提供两个满足同一 spool 契约的 translate 流，`scripts/setup.ps1`
在 Windows 上安装通用版：

- **`translate-claude-api.py`（通用，随仓库分发）**：纯 Python 标准库支持
  DeepSeek API 和 Claude API。两条 provider 路径共享同一份已验证正文：显式用户
  页面快照优先，其次是可选的绝对路径抽取器和受限内置抓取。401/403、登录页样板、
  网络故障和模型故障使用不同的 code/stage/retryable/operatorAction；失败不生成占位
  译文。长文使用分段检查点，自动重试和成本均有硬预算。Windows 配置只保存
  `credentialRef`，Key 由 DPAPI 保护；`--check` 验证凭据与目录。
- **`translate-bookmarks.py`（作者个人流）**：调 `pi` CLI +
  translate-article skill 存入 Obsidian，`scripts/setup-pi-flow.sh` 安装。

## translate 流

`flows/translate-bookmarks.py` 按以下流程处理文章：

- 不读写 Chrome Bookmarks 文件。
- 读 `outbox/translate.json`；跳过本地 `state/translate-reported.json` 里
  已报告过的 URL（防 outbox 未刷新时重复翻译）。
- 调用 `pi -p` + translate-article skill。
- 成功后原子写 inbox 报告，更新本地已报告清单，追加 action-history。
- outbox 不存在时打日志静默退出。

## Dashboard / Popup

- **dashboard.html**：状态计数、sync 配额条、按状态/类型过滤、搜索；
  行内操作：标记完成、忽略、重新排队、删除；全局操作：立即导入、立即同步、
  生成并打开静态阅读库、生成周报、批量粘贴已完成 URL（自动化桥失效时的手动兜底）、导出 JSON；
  设置区：书签文件夹名、新增 Processing Type（只增不删）。
- **popup**：显示当前标签页入队状态。用户点击保存时，从当前标签页提取可见文章正文，
  排除导航、表单、账户控件和常见样板，再经 Native Host 写入有界本地快照；不复制 Cookie、
  Authorization 或密码。受限来源可通过这一显式手势重新排队。

## 静态文章阅读前台

`flows/generate-reading-site.py` 读取 `config.json` 中 `outputDir` 根目录的中文
Markdown，确定性生成 `阅读站/index.html`、`阅读站/articles/*.html` 和前端资源：

- 索引页按精选、恢复队列、主题与最近收录组织；登录页/受限来源不会混入可信译文；
- 单篇页按关键词 → Summary → 中文译文 → 原文链接的阅读顺序组织；
- Markdown 原始 HTML 一律转义，外链只允许 `http` / `https`；
- 文章缺少 Summary/Tags 时，用正文首段与固定关键词规则生成展示兜底；
- 不需要数据库或 Web 服务，输出可通过 `file://` 直接打开；
- `reading-site` 注册在 `flows.json`，Dashboard 触发后生成并打开默认浏览器。

## 系统边界

- 写书签（归档/删除导入过的书签）。
- Processing Type 的删除/改名。
- 在扩展存储中保存文章正文（扩展只存元数据；正文由本地流写入 Markdown）。
