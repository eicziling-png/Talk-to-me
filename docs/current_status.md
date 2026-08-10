# Talk to me 当前状态

## 记录基线

- 检查时间：2026-08-10
- 当前分支：`feature/historical-psychologists-mvp`
- 当前 HEAD：`51792b0 fix: align party entry and simplify party header`
- 相对本地记录的远端分支：当前分支显示 ahead 58；请接管时先重新 `git fetch`/核对远端状态。
- 本次检查没有发现已跟踪文件的未提交修改。
- 未跟踪文件包括历史部署归档 `outputs/*.tar.gz`，以及既有的 `docs/superpowers/plans/2026-08-01-expert-voice-differentiation.md`；这些文件没有被删除或纳入本次提交。

## 已完成

- 七位专家注册表和独立人格/声音配置；Jung 已替换为 Lacan。
- 统一 Conversation Engine、首次互动阶段约束、近期历史/摘要压缩和上下文优先规则。
- S0–S3 安全分级、危机响应、输出审核和隐私友好的匿名 telemetry。
- OpenAI 与 OpenAI-compatible provider 配置；DeepSeek 等服务可通过通用环境变量接入。
- SSE 流式聊天、失败重试、缩短历史恢复、停止生成和浏览器内存会话。
- Homepage 与单专家 Chat 的 Figma 水彩/油画视觉、消息左右 lane、独立滚动区域、composer 边界和响应式布局。
- Homepage 现在有 8 个入口、两列各 4 项；`Let's party :)` 位于右列第四行并使用 Calibri。
- `/chat/party` 群聊 UI 外壳已建立，使用相同插画和聊天容器；当前提交已移除顶部参与者名单。
- 最近一次完整验证记录：`pnpm test` 为 130 passed、1 skipped；`pnpm run build` 成功，构建包含 `/chat/party`。
- 最近一次生产部署记录：Sites version 7，生产地址为 `https://talk-to-me-czl-psy.wjw9464.chatgpt.site`；首页和 `/chat/party` 已验证 HTTP 200。

## 正在开发 / 尚未完成

- `Let's party :)` 只有本地用户消息，不连接 `/api/chat`，没有七位专家共同回复、专家间互动或多角色调度。
- Figma 的最终逐像素核对、不同浏览器缩放下的人工视觉验收仍需继续。
- 真实模型 provider、数据处理条款、区域危机资源、版权和心理学专家评审需要按 release checklist 单独签核。

## 当前已知问题与风险

- 自动化测试最近一次没有失败；但生产模型是否配置正确取决于部署环境变量，缺失配置时会返回明确的配置提示/最小 fallback。
- 群聊页面“共同房间”目前不是实际多专家对话，产品文案和后续实现必须保持这一事实透明。
- release checklist 仍将公开发布标记为 blocked，原因是模型数据条款、区域危机资源、版权、心理学评审和盲测等运营事项未在代码中自动完成。
- 具体 Figma 字体授权、视觉 token 与生产 provider 配置：需要人工确认。

## 下一步任务建议

1. 确认生产环境中的 `MODEL_PROVIDER`、`MODEL_API_KEY`、`MODEL_NAME` 和兼容接口的 `MODEL_BASE_URL`，并进行一次受控聊天链路检查。
2. 为 `/chat/party` 设计并评审多角色回复协议、消息身份标识、串行/并行策略和安全边界；在设计确认前不要接入后端。
3. 运行 `pnpm lint`、`pnpm test:e2e`，并在 1920×1080、1440×900、1366×768 及窄屏进行人工验收。
4. 重新检查最新 Figma 文件与网页素材的对应关系，确认字体、纹理和版权来源。
5. 完成 `docs/release-checklist.md` 中所有人工签核，再决定是否扩大公开发布范围。
