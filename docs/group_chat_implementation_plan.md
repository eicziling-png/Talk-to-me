# Let's party :) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有单专家聊天的前提下，为 `/chat/party` 实现 Phase 1：安全前置、最多选择 3 位专家、隐藏 arrangement plan、首轮并行生成和有序展示。

**Architecture:** 群聊使用独立的 domain contract、conversation arrangement planner、prompt builder、chat service 和 API route。它复用现有专家 registry、voice profiles、safety engine、model provider、telemetry 依赖和 `Composer`，但不复用单专家 `Transcript` 的单一专家数据模型，也不修改 `/api/chat`、`ChatWorkspace` 或单专家 prompt 链路。Phase 1 不实现专家之间的回应；Phase 2 另行设计、评审和实现。

**Tech Stack:** Next.js App Router、React、TypeScript、Zod、Vitest、React Testing Library、Playwright、现有 SSE provider 接口和 CSS 视觉系统。

## Global Constraints

- 群聊只开放 `self-reflection` 一个默认模式，前端不显示模式选择器。
- Phase 1 的运行策略最多选择 3 位专家；domain contract 必须允许未来在安全上限内动态调整参与人数，不把 3 固定编码为长期协议限制。
- planner 必须保持隐藏；前端不得显示参与人数、选中或未参与专家、参与理由、评分、概率、完整 prompt 或 provider diagnostics。若协议保留 `plan` 事件，它只能作为不可渲染的内部事件。
- 首轮专家调用可以并行，但必须按 planner 顺序展示，不能按模型完成速度乱序刷屏。
- S2/S3 在安全判断后直接返回现代安全支持，不调用 planner 或专家模型。
- 群聊保持浏览器内存会话；不使用 localStorage、sessionStorage、IndexedDB、Cookie、数据库、向量库、队列或多代理框架。
- 现有 `/api/chat`、`ChatWorkspace`、`Transcript`、单专家路由、专家页面和 Homepage 不得因本计划而改变行为。
- 专家消息只显示中文名、低调色彩标记、正文、时间或生成状态；不显示时代信息或诗性副标题。
- 常规 telemetry 只记录匿名指标，不记录完整用户输入、完整专家输出、planner reason 或内部 prompt。
- 群聊 UI 继续使用当前 Figma 绘画空间、独立滚动区、底部 composer 和响应式保护。

---

## Current architecture analysis

### Single-expert Chat page

- `src/app/chat/[slug]/page.tsx` 根据 route slug 调用 `getExpert`，校验 query mode，并向 `ChatWorkspace` 传递最小专家身份和 `ConversationMode`。
- `src/components/chat/chat-workspace.tsx` 是 client component，使用 `createBrowserSession` 建立内存会话，以 React state 保存 draft、session、失败消息和 `AbortController`。
- 单专家提交通过 `fetch("/api/chat", { method: "POST" })` 发送 `{ expertSlug, mode, input, history }`，读取 SSE chunks，追加到 assistant message。
- `src/components/chat/transcript.tsx` 假设当前会话只有一个 `expert` prop，因此不直接承担多专家消息身份展示。
- `src/components/chat/composer.tsx` 只负责输入、发送、停止和 textarea 尺寸，可在不改动的情况下由群聊复用。

### Chat components and visual shell

- `src/components/chat/party-chat-workspace.tsx` 当前已有独立 client state，只把用户输入追加到本地消息，不请求 API。
- `/chat/party` 由 `src/app/chat/party/page.tsx` 直接渲染 `PartyChatWorkspace`。
- 群聊已经复用 `figma-chatpage`、`chat-room-panel`、`chat-room-header`、`chat-room-conversation` 和 `chat-composer-slot` 等视觉容器。
- `src/app/globals.css` 中已有 Chat 的 1100px、700px 响应式布局保护；新增 CSS 只允许使用 `party-chatpage` 或新增 party 专用 class，不改动单专家选择器的几何规则。

### API and model access

- `src/app/api/chat/route.ts` 负责单专家请求体限制、Zod validation、风险判断、provider factory、超时、SSE headers 和匿名 telemetry。
- `src/server/chat-route/dependencies.ts` 提供 request ID、clock、provider factory、knowledge provider、telemetry logger 和 timeout。
- `src/server/models/types.ts` 的 `ModelProvider.stream(messages, signal)` 是现有 provider 边界；Phase 1 的 planner 和专家调用都通过该接口完成。
- `src/server/orchestration/chat-service.ts` 是单专家 orchestration，负责 schema parse、expert lookup、安全退出、prompt 构建、provider recovery 和 output review。群聊不修改或复用其单专家函数，而是建立 party service。

### Prompt and state management

- `src/server/orchestration/build-messages.ts` 先放 Safety system、Conversation Engine、persona，再放摘要、压缩历史、历史消息和当前 user input。
- `src/server/orchestration/persona-prompt-template.ts` 和 `src/domain/experts/voice-profiles.ts` 是专家表达边界的既有来源。
- `src/domain/conversation/browser-session.ts` 定义浏览器内存会话和 `BrowserMessage`；群聊需要自己的消息类型，因为每条 expert message 必须携带 `expertSlug`。
- 单专家 UI 不写持久化存储；群聊必须沿用这一边界，但不应把 party-specific message 形状强行塞进单专家 session。

## Architecture changes

### Phase 1 runtime flow

```text
Party UI
  -> POST /api/chat/party
  -> request size + Zod validation
  -> assessInput
       -> S2/S3: modern safety SSE, no model calls
       -> S0/S1: planner model call
  -> validate PartyPlanSchema and enforce max 3
  -> keep arrangement plan internal; emit only actual expert messages
  -> start selected expert model streams in parallel
  -> review each expert output while streaming
  -> buffer by planned order and emit expert_start/delta/done
  -> turn_done + done
  -> Party UI updates in-memory session
```

### Conversation arrangement planner

新增不可见的 conversation arrangement planner，不新增 moderator 人格。它不是简单的专家选择器，而是为一轮共同对话安排参与方式的扩展边界。Phase 1 只使用其中的参与选择和顺序能力，未来可以在不改变 request/event 基础协议的情况下增加：

- 多轮参与决策；
- 专家之间的 `replyTo` 关系；
- 共享上下文窗口和会话阶段安排；
- 有界的 follow-up turn 计划。

Phase 1 当前只决定：

- 选择哪些 `ExpertSlug`；
- 每位专家的简短内部 focus；
- 展示顺序；
- 当前运行策略下的消息上限。

规划输入和策略必须体现房间参与，而非单一最佳回答者：

- 评估用户表达的情绪清晰度、信息丰富程度和当前对话深度。
- 结合近期实际参与专家，避免同一位或同一对专家形成固定值班模式。
- 在相关性基础上寻找互补视角；当内容仍浅时保持一人回应，当用户明确表达情绪并提供原因或经历时允许 2–3 位，当对话持续进入冲突、长期模式、关系经验或存在性问题时在当前上限内增加声音。
- Phase 1 运行时仍最多 3 位，但内部 arrangement plan 使用可扩展的参与策略，不把 3 写死为长期 contract 限制。
- 对用户完全隐藏深度判断、参与人数、候选专家、选择原因和评分；前端只接收实际出现的专家事件。

Arrangement plan 输出必须经过 Zod schema 和服务端二次约束：去重、只允许 registry 中的 slug、非空 focus、连续顺序从 0 开始。参与人数的 Phase 1 上限由独立 runtime policy 执行，而不是由长期 contract 固定；未来可以调整 policy 而不重写基础 schema。Planner 无法解析或超时时，使用安全的单专家 fallback，而不是启动七位专家。

### Provider concurrency

Planner 是一次独立的模型调用。选中的专家首轮调用使用 `Promise`/异步迭代并行启动，但服务端保存每位专家的独立 buffer，并按 planner order 向 SSE 输出。这样同时获得较低的总等待时间和稳定的阅读顺序。

Phase 1 不创建 `replyToExpertSlug` 任务，不做第二轮专家回应。所有回应阶段字段可以暂不进入实现契约，避免提前引入 Phase 2 行为。

### Isolation boundary

新增端点使用 `/api/chat/party`，新增服务使用 `src/server/party/`，新增消息和 session 使用 `src/domain/party/`。现有 `/api/chat`、单专家 orchestration、单专家 UI 和专家页面不得被改写为支持 union type 或 party branch。

## New files

### Domain contracts

- `src/domain/party/types.ts`
  - 定义 `PartyConversationRequest`、`PartyMessage`、`PartyPlan`、`PartyParticipantPlan`、`PartyStreamEvent`、`PartySession` 等公共类型。
  - Phase 1 的 `mode` 固定为 `"self-reflection"`，避免 UI 暴露未审核的其他模式。
  - `PartyMessage` 的 expert 分支必须包含 `expertSlug`，user 分支不得伪造 expert identity。

- `src/domain/party/schema.ts`
  - 定义 `PartyConversationRequestSchema`、`PartyPlanSchema`、arrangement plan output schema 和 stream event payload schema。
  - 限制 input、history、summary、focus 和事件文本长度。
  - 不允许未知 expert slug、未知事件类型或重复专家；不把 Phase 1 的 3 位运行上限写死在基础 schema 中。

- `src/domain/party/browser-session.ts`
  - 提供 party 专用的内存 session 创建、消息追加、状态变更、清空和未完成 expert 消息标记。
  - 不引入任何浏览器持久化 API。

### Server orchestration

- `src/server/party/build-planner-messages.ts`
  - 组合 planner 的 Safety system、Conversation Engine、party room rules、七位专家轻量 profile 摘要、有限历史和当前输入。
  - 明确 planner 只输出结构化计划，不生成面向用户的文本。

- `src/server/party/conversation-arrangement-planner.ts`
  - 通过现有 `ModelProvider` 执行一次 arrangement planning stream，收集并解析结构化输出。
  - 对解析结果执行 schema validation、slug validation、去重和排序；将 Phase 1 的最多 3 位限制作为独立 runtime policy 应用。
  - provider 错误或解析失败时返回可测试的 fallback plan 或明确的 typed error，并保留未来扩展参与人数和 follow-up plan 的边界。

- `src/server/party/build-expert-messages.ts`
  - 为单个已选专家建立独立 prompt。
  - 复用现有 expert profile、voice profile、Conversation Engine 和 safety 规则的语义，但不修改单专家 prompt builder。
  - 将 planner focus 作为受限数据注入，不能覆盖专家 identity 或安全指令。

- `src/server/party/party-chat-service.ts`
  - 执行安全判断后的 planner、并行专家 generation、每位专家的 output review、顺序缓冲和 typed stream events。
  - Phase 1 不实现专家间 peer context 或 response plan。
  - 支持 AbortSignal、单专家失败跳过、全失败降级、首轮消息上限和匿名指标所需的 aggregate counters。

### API

- `src/app/api/chat/party/route.ts`
  - 独立处理 request body size、JSON parse、`PartyConversationRequestSchema`、S0/S1/S2/S3、timeout、SSE headers 和 telemetry。
  - 复用 `getChatRouteDependencies` 的 provider factory、request ID、clock、timeout、knowledge/telemetry dependencies。
  - 不 import 或调用单专家 `/api/chat` route 的内部函数，避免两个协议互相耦合。

### Frontend

- `src/components/chat/party-transcript.tsx`
  - 渲染 user lane 和多 expert lane。
  - 专家消息只显示中文名、色彩标记、正文、时间或生成状态。
  - 支持 `expert_start`、增量文本、完成、失败和未完成标记。
  - 不显示 era、poetic subtitle、planner reason、未发言专家或完整 prompt。

## Modified files

- `src/components/chat/party-chat-workspace.tsx`
  - 保留现有 party header、绘画背景、返回按钮、清空菜单、composer 和响应式 class。
  - 将“本地追加用户消息”替换为 party session reducer/state、`/api/chat/party` 请求、SSE event handling、停止生成、失败重试和清空。
  - 继续复用现有 `Composer`；不调用 `/api/chat`。

- `src/app/globals.css`
  - 只新增 party-specific message identity、生成状态和多专家间距样式。
  - 不修改 `.figma-chatpage` 的既有单专家几何规则；所有新选择器以 `.party-chatpage` 为前缀。

- `src/tests/components/party-entry.test.tsx`
  - 只在实现 party API 后需要补充“入口不受影响”的回归断言时修改；现有专家入口断言必须继续通过。

- `src/tests/components/party-chat-workspace.test.tsx`
  - 若文件尚不存在则创建；若已有旧 UI shell 测试则扩展，不删除其“本地外壳不调用 `/api/chat`”的保护。

- `src/tests/integration/api/party-chat.test.ts`
  - 新增群聊 API 集成测试，不修改现有 `src/tests/integration/api/chat.test.ts`。

- `src/tests/unit/party/schema.test.ts`
- `src/tests/unit/party/browser-session.test.ts`
- `src/tests/unit/party/planner.test.ts`
- `src/tests/unit/party/planner-prompts.test.ts`
- `src/tests/unit/party/expert-prompts.test.ts`
- `src/tests/unit/party/party-chat-service.test.ts`
  - 新增 planner、schema、prompt、service 和 browser-session 单元测试，不修改既有单专家 unit tests。

- `src/tests/e2e/party.spec.ts`
  - 新增只覆盖 `/chat/party` 的 E2E；不改动现有单专家 E2E 文件。

不应修改：

- `src/app/api/chat/route.ts`
- `src/components/chat/chat-workspace.tsx`
- `src/components/chat/transcript.tsx`
- `src/components/chat/composer.tsx`
- `src/server/orchestration/chat-service.ts`
- `src/server/orchestration/build-messages.ts`
- `src/server/orchestration/persona-prompt-template.ts`
- `src/app/page.tsx`
- 任何 `src/app/experts` 页面或专家 registry/profile 文件

## Data flow

### Request

1. Party workspace trim 用户输入，拒绝空提交，并把当前内存 history 转为 `PartyMessage[]`。
2. POST `/api/chat/party`，请求只包含固定 `mode: "self-reflection"`、`input`、受限 history 和可选 summary。
3. Route 做 byte limit、JSON parse 和 schema validation。
4. Route 调用现有 `assessInput`。
5. S2/S3 直接返回 safety event，不创建 planner/provider。
6. S0/S1 调用 party planner。

### Plan

1. Planner 读取当前输入、近期上下文和七位轻量专家资料。
2. Planner 输出候选参与者和顺序。
3. 服务端 schema 校验并强制 cap 到最多 3 位。
4. Arrangement plan 只在服务端使用；客户端不得从 `plan` 得到人数、selected expert slugs、message limit、未选择专家、reason 或 score。客户端只接收并渲染实际出现的 expert events。

### Generation

1. 对每个选定专家调用独立的 `buildExpertMessages`。
2. 所有首轮调用并行启动，共享同一个 abort signal。
3. 每位专家的 chunk 先经过 output review；违规内容转换为中性安全提示或取消该专家消息。
4. 服务端为每位专家维护独立 buffer，根据 `plan.order` 依次发出 `expert_start`、`expert_delta`、`expert_done`。
5. 单个专家失败不撤回其他专家；全失败返回可重试的中性错误。
6. Phase 1 完成后发 `turn_done` 和 `done`，不启动专家回应阶段。

### Client state

Party session 至少需要以下状态：

- `idle`
- `streaming`
- `failed`
- `interrupted`
- `messages`
- `activePlan`
- `failedInput`

状态只存在 React state/reducer。停止、清空、刷新和关闭行为必须与现有单专家的临时会话边界一致。

## Development steps

每个任务应先写测试、确认测试按预期失败，再做最小实现，并在任务结束运行该任务的 focused tests。每个任务都应保持现有单专家测试不变。

### Task 1: Freeze the isolation boundary and domain contracts

**Files:**

- Create: `src/domain/party/types.ts`
- Create: `src/domain/party/schema.ts`
- Create: `src/domain/party/browser-session.ts`
- Test: `src/tests/unit/party/schema.test.ts`
- Test: `src/tests/unit/party/browser-session.test.ts`

Steps:

- [x] 写 request、message、plan、stream event 和 session 的失败测试，覆盖固定 `self-reflection`、空输入、未知 slug、重复 slug、可扩展的参与人数列表和未知事件；Phase 1 的 3 位 runtime cap 留给 arrangement planner policy 测试。
- [x] 运行 focused Vitest，确认测试因类型/schema/session 实现缺失而失败。
- [x] 实现最小 Zod contract 和纯内存 session reducer/helper。
- [x] 运行 focused Vitest，确认 contract、可扩展参与人数列表、清空、停止和 incomplete message 标记通过。
- [x] 检查源码没有出现 localStorage、sessionStorage、indexedDB 或 Cookie 写入。

### Task 2: Implement conversation arrangement planner

**Files:**

- Create: `src/server/party/build-planner-messages.ts`
- Create: `src/server/party/conversation-arrangement-planner.ts`
- Test: `src/tests/unit/party/planner.test.ts`
- Test: `src/tests/unit/party/planner-prompts.test.ts`

Steps:

- [x] 用 `FakeModelProvider` 写 arrangement plan 输出合法计划、重复专家、未知专家、动态参与人数列表、非法 JSON 和 provider failure 的失败测试。
- [x] 写 prompt 断言，确认 Safety system 在前、用户内容使用 data delimiters、arrangement planner 不承担专家人格、不暴露完整内部 reason 给客户端。
- [x] 运行 focused tests，确认 arrangement planner contract 和实现缺失导致预期失败。
- [x] 实现一次 arrangement planning stream 收集、JSON parse、Zod validation、registry validation、去重、排序和独立的 `PHASE1_MAX_PARTICIPANTS = 3` runtime policy。
- [x] 实现 planner failure 的安全单专家 fallback，并让 fallback 可由测试显式识别。
- [x] 运行 focused tests，确认 arrangement planner 只产生结构化计划，不生成面向用户的回复。

### Task 3: Build independent expert prompts and party service

**Files:**

- Create: `src/server/party/build-expert-messages.ts`
- Create: `src/server/party/party-chat-service.ts`
- Test: `src/tests/unit/party/expert-prompts.test.ts`
- Test: `src/tests/unit/party/party-chat-service.test.ts`

Steps:

- [x] 用 fake provider 写测试，确认选中 1–3 位专家时每位只收到自己的 identity/voice profile 和共享上下文。
- [x] 增加 personality differentiation tests：七位专家的 prompt/output fixture 必须包含各自的核心关注点和语言边界，且不得退化为通用心理咨询、诊断或 AI 助手回复。
- [x] 写并行执行测试，确认 planner order 与 provider completion order 不同的时候，service 仍按 planner order 产出事件。
- [x] 写失败测试，确认一个专家失败时其他专家仍可完成；全部失败时产生 typed failure。
- [x] 写安全测试，确认 S2/S3 不进入 service 的 model path，专家 output review 拦截诊断、用药和虚假紧急行动声明。
- [x] 实现 party prompt builder，复用 profile/voice profile 的内容来源，但不修改单专家 prompt builder。
- [x] 实现 Phase 1 service：planner → parallel expert generation → per-expert review → ordered events；明确不创建 peer response。
- [x] 运行 focused tests，确认事件顺序、并行、abort、cap 和失败降级通过。

### Task 4: Add the isolated streaming API

**Files:**

- Create: `src/app/api/chat/party/route.ts`
- Test: `src/tests/integration/api/party-chat.test.ts`

Steps:

- [x] 写 invalid JSON、过大 body、schema failure、unknown slug planner output、safe stream、S2/S3、provider unavailable、timeout 和 telemetry allowlist 的失败测试。
- [x] 确认测试不会 import 单专家 route 的私有实现，只通过 POST `/api/chat/party` 验证公开协议。
- [x] 实现独立 route：body limit、schema validation、safety-first、dependency factory、abort forwarding、SSE headers、stable public error codes 和匿名 telemetry。
- [x] 实现有限 plan event payload，禁止 reason、score、未发言专家和完整消息进入 telemetry。
- [x] 运行 `pnpm test -- src/tests/integration/api/party-chat.test.ts`，确认新 API 通过且既有 `src/tests/integration/api/chat.test.ts` 未被修改。

### Task 5: Replace the local party shell with party session UI

**Files:**

- Create: `src/components/chat/party-transcript.tsx`
- Modify: `src/components/chat/party-chat-workspace.tsx`
- Modify: `src/app/globals.css` with `.party-chatpage`-scoped selectors only
- Test: `src/tests/components/party-chat-workspace.test.tsx`
- Test: `src/tests/components/party-transcript.test.tsx`

Steps:

- [x] 写组件失败测试，覆盖实际消息可见性、专家中文名、色彩 marker、消息增量、ordered lanes、loading、stop、retry、clear 和 empty submit；不允许渲染参与人数或 planner 信息。
- [x] 写回归测试，确认 party workspace 不调用 `/api/chat`，Composer 仍可发送，单专家 `ChatWorkspace` import/行为不变。
- [x] 实现 `PartyTranscript`，只显示中文名、色彩标记、正文、时间/状态，不显示时代信息或诗性副标题。
- [x] 实现 party SSE parser 和 workspace state updates；在 workspace 请求中固定 `mode: "self-reflection"`；复用 `Composer`，不复制其输入逻辑。
- [x] 增加最小 party-only CSS，保持现有背景、独立滚动和 mobile breakpoints。
- [x] 运行 component tests，确认无七人同时 typing indicator、无顶部参与者清单、无持久化写入。

### Task 6: Add focused party E2E and regression verification

**Files:**

- Create: `src/tests/e2e/party.spec.ts`
- Modify: none in existing single-expert E2E files

Steps:

- [x] 使用 Playwright route interception 为 `/api/chat/party` 提供确定性 plan/expert events，避免 E2E 依赖真实模型 provider。
- [x] 覆盖首页 party link → `/chat/party`、固定 self-reflection UI、多个 expert lanes、顺序展示、停止、清空和刷新不恢复；后续调整需补充隐藏 plan 验证。
- [x] 覆盖 mobile party layout 中 composer、expert names 和 message lanes 不溢出。
- [x] 运行 focused party E2E；确认新测试只依赖 party route，不改变旧 E2E。
- [x] 单独运行 `pnpm test`、`pnpm lint` 和 `pnpm build`，记录既有 E2E 断言与本次新增 party E2E 的区别。

### Post-Phase-1 adjustment: hidden planner and multi-turn participation diversity

这项调整来自 Phase 1 人工体验反馈，属于后续实现任务；在用户确认设计前不修改代码。它不改变 Phase 1 的“首轮并行、最多 3 位专家、无专家间回应”边界，也不把最多 3 位写死为长期 contract 限制。

**目标：** 让用户只感受到一个可能由不同声音加入的共同房间，而不是连续多轮只与同一位专家聊天。

**设计约束：**

- planner 继续定义为 conversation arrangement planner，但完全隐藏在服务端；不得在 UI 显示“本轮有 X 位专家回应”、参与人数、专家名单、未参与者、选择原因、评分、概率或 planner 状态。
- 前端只渲染实际出现的 `expert_start`、`expert_delta`、`expert_done` 消息；如保留 `plan` SSE 事件，它不得驱动可见 UI，也不应向公开客户端暴露 selected slugs 或 message limit。
- 相关性仍是首要选择依据；不强制每轮多人回复，也不为了轮换而加入不相关专家。
- 同一专家不得连续两轮成为唯一回应者。若上一轮只有一位专家回应，下一轮对该专家作为唯一回应者施加强惩罚，并提高近期未出现或参与较少专家的参与概率。
- 允许在缺乏足够替代视角、或安全判断要求时保留同一专家，但这是内部降级条件，不能成为默认路径。
- 保留 Phase 1 不实现专家之间回应、peer context 或第二轮专家生成。

**计划修改范围（待确认后执行）：**

- `PartyConversationRequest` / browser session 增加受限的近期参与元数据；记录最近若干用户轮次的实际回应者、是否为唯一回应者和有限计数，保持可扩展以支持未来动态参与人数。
- `build-planner-messages` 将近期参与元数据作为编排输入；不把 planner reason、score 或概率发送到客户端，也不把完整内部调度历史放入 prompt。
- `conversation-arrangement-planner` 增加轮换策略：相关性权重、连续唯一回应惩罚、低频专家奖励和同学派重复约束；具体权重保持可调，不改变 Phase 1 runtime cap。
- `party-chat-workspace` / `PartyTranscript` 删除参与人数提示和 plan 可见状态，只保留实际专家消息及其生成状态。

**新增验证：**

- 两轮连续输入时，同一专家不能连续成为唯一回应者；
- 上一轮只有一位专家时，下一轮在存在相关替代专家的情况下优先产生不同声音；
- 没有足够相关替代专家时仍可自然地只有一位专家回应，不强行凑数；
- 多轮窗口不会让七位专家退化为同一种通用心理咨询语气；
- 组件和 E2E 不出现参与人数、未参与专家、选择原因或 planner 信息，只出现实际专家消息；
- 单专家聊天、Homepage、现有专家页面和 `/api/chat` 的测试与实现保持不变。

### Post-Phase-1 adjustment: depth-aware room participation

这项调整来自 Phase 1 人工体验，属于新的 orchestration 设计任务；在用户确认前不修改实现。它保留首轮并行、Phase 1 最多 3 位专家、最多一次专家回应、只开放 `self-reflection` 和不实现专家互相回应的边界。

**目标：** 让用户感到这是一个会随自我表达逐渐展开的共同房间，而不是 Donald Winnicott 与 Sigmund Freud 轮流值班。

**设计约束：**

- planner 规划本轮房间的参与方式，综合当前输入、情绪明确程度、信息丰富程度、对话深度、近期参与历史和专家视角互补性；不再以“最相关专家”作为主要产品模型。
- 浅层输入通常安排 1 位；明确情绪并提供原因或具体经历时可安排 2–3 位；持续深层探索时在当前上限内增加互补声音。不得用固定人数制造热闹，也不得让动态规则退化成简单随机轮换。
- 同一专家不能连续多轮作为唯一回应者；上一轮单人回应后提高其他相关专家参与机会；避免同一两个专家反复组成固定组合，同时保留人格相关性。
- planner、参与深度、人数、候选/未参与专家、原因、分数和概率全部隐藏；前端只渲染实际出现的专家消息，不发送“本轮有 X 位专家回应”。
- 专家 prompt 明确其是七位共同房间的一员；禁止暗示其他专家不在线、未到场或正在沉思，禁止解释调度逻辑；用户询问其他角度时，只能自然承认存在不同视角并邀请继续展开。

**计划修改范围（待确认后执行）：**

- `PartyConversationRequest` / browser session 增加受限的对话深度和近期参与元数据，保持可扩展且不向客户端暴露内部 planner 细节。
- `build-planner-messages` 增加浅层、情绪表达和深层探索的判别信号，以及互补视角和隐藏编排约束。
- `conversation-arrangement-planner` 增加按深度选择 1–3 位的策略，并与现有多轮多样性 policy 合并；fallback 也必须经过多样性 policy，不能固定回到上一位专家。
- `build-expert-messages` 增加共同房间身份规则和禁止“其他人不在/正在沉思/为什么没回应”等泄漏调度的 prompt 约束。
- `PartyTranscript` / party workspace 继续只展示实际消息，移除任何人数、计划或未参与状态。

### Post-Phase-1 diagnosis: third-turn 502 and deterministic opening voices

这项诊断来自线上 Worker logs、当前 commit `482d12e` 的代码路径和现有 contract。当前只记录原因与修复计划，不在本次更新中修改实现。

#### Issue 1 root cause: dynamic plan invariant failure

- 第三轮线上失败是 `/api/chat/party` 返回 502；日志中的请求体约为 475–650 bytes，未触发 32KB request body、80 条 history 或单条 4000 字符限制。
- `PartyChatWorkspace` 会从内存 `session.messages` 重建完整 `PartyMessage[]` history；当前类型没有 `activePlan` 字段，因此不是 active plan 丢失导致 history 清空。AbortController 也在每轮 finally 中释放并重新创建。
- 深度参与 policy 会把 planner 的单专家候选补充为 2–3 位，但 `applyParticipantPolicy` 只改变 `participants`，没有同步把 `messageLimit` 调整到至少等于最终参与人数。
- `runPartyChat` 随后执行 `PartyPlanSchema.parse(plan)`；`messageLimit < participants.length` 触发 ZodError，API route 将其映射为 `planner_invalid_output` 的 502，前端 catch 统一显示“发送失败”。这解释了为什么失败常在第三轮出现：前两轮尚未触发深度扩展，第三轮开始满足参与人数扩展条件。

#### Issue 1 repair plan

- 将“去重、深度扩展、轮换、fallback、messageLimit 归一化”合并为一个最终 arrangement policy；最终 plan 必须在离开 planner 前通过同一份 schema 校验。
- `messageLimit` 至少等于最终首轮 participants 数量，并继续受 Phase 1 runtime cap 约束；不能让动态参与扩展产生非法 plan。
- 为 planner invalid output、plan invariant failure、provider failure、timeout 建立内部可区分的错误 code 和 telemetry；前端仍隐藏内部机制，但不再把所有服务端失败混成无法诊断的单一状态。
- 增加三轮连续请求测试：第二轮和第三轮携带完整 history，验证 request schema、planner、service、SSE 和 session 状态均可继续；覆盖深度扩展到 2–3 位时不会返回 502。
- 增加真实 history budget 测试，验证接近边界时使用受限 summary/recent window，而不是无限拼接完整专家文本。

#### Issue 2 root cause: fixed registry-order fallback and tie-break

- 当前 fallback 固定返回 `winnicott`。
- 轮换替代专家使用 `EXPERTS.find(expert => expert.slug !== current)`；`EXPERTS` 按出生年份排序，因此在 Winnicott 之后稳定选择 Freud。
- 互补候选的 score 相同时，`.toSorted` 保留 registry 顺序；当前没有 session seed，也没有新会话的 opening coverage policy，所以不同新会话可能得到相同的第一、第二位专家。
- planner 虽然收到多样性提示，但模型输出失败或只输出一个候选时，服务端固定顺序 policy 覆盖了自然变化；这不是用户可见 planner 的问题，而是服务端 tie-break 与 fallback 设计问题。

#### Issue 2 repair plan

- 在 browser party session 中生成不可见的 session seed，并随内部 arrangement context 使用；不把 seed、随机数、评分或选择理由发送给客户端。
- 将候选排序拆为：相关性过滤/排序 → 近期参与惩罚与覆盖奖励 → 理论视角互补 → seeded tie-break。seed 只解决同分候选的自然变化，不能替代相关性。
- 新会话首轮使用 diversified opening policy：允许 1 位轻量回应，但从多个合法开场专家池中按 seed 变化；不得固定 Winnicott 起步。
- fallback 与正常 planner 使用同一 participant policy；planner 失败时也必须遵守 opening diversity、recent coverage 和“不能连续唯一回应”规则。
- 在有限近期窗口中记录实际参与专家、唯一回应状态和覆盖计数；不保存 planner reason、score 或概率，也不向 UI 暴露未参与专家。
- 增加测试：多 seed 产生多个合法开场组合；同 seed 可复现；不同用户新 session 不固定 Winnicott → Freud；连续多轮不固定同一专家或同一双人组合；深度表达可在 cap 内增加互补专家。

#### Scope boundary

本轮修复设计不修改 Homepage、单专家 `ChatWorkspace`、单专家 `/api/chat`、现有三种单专家模式，也不实现专家之间回应。Party UI 仍只显示实际到达的专家消息，planner 和多样性 policy 完全隐藏。

### Task 7: Phase 1 review gate

**Files:**

- Modify: `docs/current_status.md` only after implementation is accepted
- Modify: `docs/changelog.md` only after implementation is accepted

Steps:

- [ ] 检查 `git diff`，确认没有 Homepage、单专家 API、单专家 Chat 或专家页面的非计划修改。
- [ ] 验证单专家 contract、safety、provider、chat workspace 和 privacy tests 仍通过。
- [ ] 验证群聊不发送完整消息到 routine telemetry，不使用持久化存储，不调用 `/api/chat`。
- [ ] 进行 1920×1080、1440×900、1366×768 和窄屏的 party 人工验收，确认插画、文字、message lanes 和 composer 没有重叠。
- [ ] 在 Phase 1 验收通过前，不实现专家回应、peer context、第二轮 planner 或其他对话模式。
- [ ] 只有用户确认 Phase 1 后，才更新 current status/changelog，并单独规划 Phase 2。

## Testing strategy

### Unit tests

- Party schema：固定 mode、输入长度、history 长度、slug、cap、event payload 和未知字段。
- Browser session：消息追加、expert identity、内部 plan 不可见、停止、失败、清空和 refresh-equivalent new session。
- Planner：合法/非法 JSON、重复、未知专家、超过 cap、fallback、reason 不外泄。
- Prompt builder：Safety first、Conversation Engine、用户 data delimiters、独立 persona/voice profile、无普通 AI assistant 语言。
- Personality differentiation：七位专家分别通过 hallmark concept、语言气质、理论边界和 forbidden-pattern checks；同一用户输入不能让七位专家退化为相同的安慰、诊断或通用建议模板。
- Party service：并行启动、顺序输出、单专家失败、全失败、abort、reviewOutput 和 S2/S3 no-model path。

### Multi-turn participation tests

- 使用多轮 planner fixtures 验证同一专家不能连续两轮成为唯一回应者。
- 验证上一轮只有一位专家回应时，下一轮会提高其他相关专家的参与机会，同时仍以相关性为首要依据。
- 验证没有足够相关替代专家时允许自然的单专家回应，不强制增加人数。
- 验证近期参与窗口只传递受限元数据，且不把 planner reason、score 或 probability 暴露给客户端。

### Depth-aware participation tests

- 浅层问候和日常输入通常只产生 1 位专家，且不因为“七位都相关”而强行扩展。
- 明确表达情绪并提供原因或具体经历时，planner 在存在互补视角的情况下可以安排 2–3 位专家。
- 持续分享内心冲突、长期模式、关系经验或存在意义问题时，参与数可以达到当前 Phase 1 上限，但不向用户暴露深度判断或人数。
- 多轮 fixture 不应表现为 Freud/Winnicott 固定交替；相关性、多样性、近期参与历史和互补性共同影响安排。
- prompt tests 拒绝“其他专家不在/还没来/正在沉思/没有参与”等表达，并确认专家知道自己是七位共同房间的一员。
- planner tests 确认 arrangement plan 保留未来动态参与人数和专家互动的扩展空间，同时 Phase 1 仍不创建 peer response。

### Component tests

- Party page 保留标题、返回首页、菜单和 composer。
- 不渲染 `plan`、参与人数、selected experts/message limit、未发言专家、选择原因、评分或概率；只渲染实际到达的专家消息。
- 每条 expert message 显示中文名、色彩标记、正文和状态，不显示 era/poetic subtitle。
- 首轮最多三条 expert messages；不显示七人同时 typing indicator。
- 单专家 `ChatWorkspace` 和 `Transcript` 不被 party state 侵入。

### Integration tests

- `/api/chat/party` 的 validation、S0/S1 stream、S2/S3 safety exit、provider failure、timeout、abort 和 SSE event schema。
- telemetry 只包含 request ID、duration、outcome、risk level、anonymous token estimate 和 aggregate counts。
- 通过 dependency injection 检查 S2/S3、planner failure 和单专家 failure 的调用次数。

### E2E tests

- 使用 Playwright route interception，不依赖线上模型配置。
- 覆盖 party entry、party route、实际多专家消息、顺序展示、停止、重试、清空、刷新和移动端布局；确认不存在参与人数、未参与专家或 planner 信息。
- 不修改现有单专家 E2E；现有旧断言若仍失败，应作为独立测试维护问题处理，不在本功能计划中顺手修复。

### Verification commands

实现 Phase 1 后执行：

- `pnpm test -- src/tests/unit/party src/tests/components/party-chat-workspace.test.tsx src/tests/components/party-transcript.test.tsx src/tests/integration/api/party-chat.test.ts`
- `pnpm test`
- `pnpm lint`
- `pnpm test:e2e -- src/tests/e2e/party.spec.ts`
- `pnpm build`

只有 focused party tests、完整 Vitest、lint 和 build 都有新鲜证据后，才能声称 Phase 1 实现完成。E2E 失败不得通过修改单专家测试或降低旧测试断言来掩盖。

## Commit boundaries

如果后续获得提交授权，建议按以下独立边界提交：

1. `feat: add party conversation contracts`
2. `feat: add party planner and expert orchestration`
3. `feat: add isolated party chat api`
4. `feat: connect party workspace to streaming api`
5. `test: add party integration and e2e coverage`

当前阶段只生成计划，不创建 commit，不部署，也不实现 Phase 2 专家回应。
