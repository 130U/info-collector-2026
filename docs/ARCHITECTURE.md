# 工程架构与验证

范围：扩展、Native Messaging host、翻译/生成流程、静态阅读站、安装脚本与 CI。

当前支持环境为 Windows 11、Chrome 和 Python 3.9+。失败分类、有界重试与状态恢复属于运行契约。部署与人工抽检遵循 [OPERATIONS.md](OPERATIONS.md) 的 SLI、回滚和检查门槛。

## 结构与扩展点

| 层 | 单一职责 | 扩展方式 |
| --- | --- | --- |
| `extension/` | 采集、队列与操作界面 | 按 `processingType` 注册新处理类型 |
| `host/` | 有界文件桥接与受信流程触发 | 在本机 `flows.json` 注册命令并固定脚本哈希 |
| `flows/` | 抽取、翻译、周报与站点生成 | provider 配置、独立生成器和检查点 |
| `reader/` | 阅读终端源资产 | 数据属性与渐进增强交互 |
| `site/public/` | 可独立部署的静态快照 | 由刷新脚本生成，不作为第二份手工源代码 |

模块间通过版本化 JSON/Markdown 文件通信，无数据库和运行时前端依赖。新增流程不需要改动队列状态机核心。

## 安全结论

- API Key 使用 DPAPI，配置文件只保存凭据引用；官方模型端点默认锁定，自定义 HTTPS 代理需显式开启。
- 外部抓取拒绝非公网目标，并在重定向后重新校验；401/403 为终止型授权状态。
- 浏览器快照仅由用户点击触发，不保存 Cookie、请求头或表单值；host 对 URL、大小与协议再次校验。
- 网页与模型输出均视为不可信输入；动态 UI 内容转义，公开站生成器执行内容质量与隐私隔离。
- 流程命令使用参数数组、可信目录与 SHA-256 固定，不经 shell 拼接。

应用层 SSRF 校验不能替代生产网络的 egress 防火墙；公开内容仍需版权、隐私与再发布审查。

## 冗余与维护性

- `reader/assets/*` 是前端源文件；`site/public/assets/*` 是可部署快照。两者由刷新脚本同步并由测试校验，属于受控构建产物。
- Node 侧无第三方运行时依赖；Python 流程使用标准库。CI 同时覆盖 Windows、Ubuntu、静态站构建与安全契约。

## 发布门槛

每次发布必须通过 `npm.cmd test`、Python 编译、公开站生成一致性检查和凭据/危险 API 静态扫描。变更抓取、翻译或隐私隔离逻辑时，必须执行 `docs/OPERATIONS.md` 中的故障注入与回滚演练。

## 队列与持久化契约

Chrome 书签提供导入来源；处理状态属于扩展。文章身份来自标准化 URL，书签移动或删除不会撤销已完成状态。

活跃记录压缩后按 `articleKey` 哈希放入 32 个 `chrome.storage.sync` 桶。所有 job 完成且 30 天未更新的记录进入 `chrome.storage.local` 归档；sync 用量超过 80% 时提前归档最旧的已完成记录。导入同时查询活跃桶与本机归档。只有活跃记录跨设备同步；本机归档不跨设备，外部流程的已报告清单提供另一层去重。

## 文件桥接与流程触发

扩展经 Native Messaging host 交换 `outbox/<type>.json` 与 `inbox/` Completion Report。报告应用幂等，确认后归档；处理状态语义留在扩展中。Dashboard 的手动标记和批量导入可独立使用。

Dashboard 按 `processingType` 触发 `~/.info-collector/flows.json` 中注册的命令。扩展不能传命令或参数；host 校验受信目录与脚本哈希，通过参数数组启动进程，并用 lockFile 检测运行状态。结果沿 Completion Report 返回。手动触发的 `--manual` 标记保持定时锚点 `lastScheduledStartAt` 不变。

触发粒度是处理类型：一次流程消费该类型 outbox 中全部未报告文章。运行状态来自 lockFile 与 `state/<type>-status.json`；它是流程状态快照，不替代逐文章完成报告。
