# Let's party :) Phase 2 Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with a review checkpoint after each task. Phase 2A must remain separate from Phase 2B; do not enable `challenger` during Phase 2A.

**Goal:** 在不改变单专家聊天和 Phase 1 前端体验的前提下，为 Let's party :) 增加由用户价值驱动的、单层有限 expert perspective supplementation。

**Architecture:** 保留现有 `/chat/party`、PartyConversationRequest、PartyMessage 和现有 SSE 展示协议。服务端在现有 conversation arrangement planner 后增加一个可选的补充安排与第二阶段生成，仅允许 `supporting_voice` 或 `integrator`，并将参考上下文限制为当前轮 primary 输出。前端继续按普通专家消息展示，不暴露内部安排关系。

**Tech Stack:** 现有 TypeScript/Next.js(or Vinext) 服务端、Zod schema、SSE stream、React PartyChatWorkspace、Vitest、Testing Library、Playwright。

## Global Constraints

- Phase 2A 使用 “expert perspective supplementation”，不实现专家之间直接聊天。
- Phase 2A 只允许 `supporting_voice` 和 `integrator`；`challenger` 保持关闭，留到 Phase 2B 单独审核。
- 每个用户回合最多一次视角补充，最大深度为 `user → primary → supplement`。
- Primary 使用正常 output budget；supporting voice 与 integrator 必须明显短于 primary。
- 前端不显示参与人数、未参与专家、planner reason、score、`referenceExpert` 或 `contextFrom`。
- 不修改 Homepage、单专家 ChatWorkspace、单专家 API、既有单专家 prompt 和既有三种单专家模式。
- 不把内部安排关系写入浏览器 history 或客户端 request body。
- Phase 1 的动态参与、单问题预算、隐藏 planner 和人格差异约束必须继续成立。

## Architecture changes

### Server-side flow

1. 解析并安全评估用户当前输入。
2. 使用现有 planner 生成 Phase 1 participant arrangement。
3. 为本轮选择 `primary_responder`，并判断是否值得安排一次 perspective supplementation。
4. 生成 primary；只有 primary 成功、通过安全过滤且补充安排仍然有效时，才生成 supplement。
5. supplement 读取用户上下文和 primary 的只读参考文本，输出仍然直接面向用户。
6. 输出仍通过现有 expert SSE 事件进入 PartyChatWorkspace；生成失败时保留 primary，跳过 supplement。

### Internal contract

Phase 2A 的内部计划应扩展而不是替换 Phase 1 的 `responseRole`：

```ts
type PartySupplementationRole = "none" | "integrator"
type PartyOutputBudget = "primary" | "supporting" | "listener"

type PartyPerspectiveSupplement = {
  expertSlug: string
  responseRole: "supporting_voice" | "listener"
  supplementationRole: PartySupplementationRole
  referenceExpert: string
  outputBudget: "supporting"
  layer: 1
}
```

`referenceExpert` 表示生成上下文来源，不表示 B 正在和 A 对话。若内部命名需要更通用的上下文字段，可在生成 context 中使用 `contextFrom`，但客户端不得提交或接收这两个字段。

## File map

### Files to create

- `src/server/party/party-perspective-supplementation.ts`：判断补充是否值得生成、构造内部补充安排、执行深度和数量限制。
- `src/tests/party-perspective-supplementation.test.ts`：覆盖触发、浅层人工互动、角色、预算和失败降级。
- 如现有测试组织方式需要端到端覆盖，可新增 `e2e/party-phase2.spec.ts`；仅在现有 E2E 结构确实需要独立 fixture 时创建。

### Files to modify

- `src/domain/party/types.ts`：增加服务端内部 supplement 类型；保持 `PartyMessage` 客户端可见形状兼容。
- `src/domain/party/schema.ts`：校验 Phase 2A 的角色、`layer === 1`、最多一次 supplement、有效 `referenceExpert` 和 output budget；拒绝 `challenger`。
- `src/server/party/conversation-arrangement-planner.ts`：在现有相关性、深度、轮换和 Phase 1 上限之后，生成可选 supplement arrangement；不得让 supplement 覆盖 diversity policy。
- `src/server/party/build-planner-messages.ts`：增加 perspective supplementation 的判定规则、Phase 2A 角色范围和 artificial interaction 禁止条件。
- `src/server/party/build-expert-messages.ts`：为 primary 与 supplement 使用不同 output budget；supplement prompt 将 primary 标记为只读参考上下文。
- `src/server/party/party-chat-service.ts`：在 primary 成功后串行生成最多一个 supplement；处理过滤、超时、abort 和降级，不启动第三层生成。
- `src/components/chat/party-chat-workspace.tsx`：原则上不改布局；如现有事件类型需要区分生成阶段，仅消费不含内部关系的既有 expert events。
- 对应现有 `src/tests` 中的 party planner/schema/service/prompt 测试文件：补充回归断言，不修改单专家测试。

## Data flow

```text
client: user input + user/expert history
        │
        ▼
party route: validate request and safety
        │
        ▼
Phase 1 arrangement planner
        │
        ├── primary plan: expertSlug + primary output budget
        └── optional supplement plan:
              expertSlug + integrator/supporting_voice
              referenceExpert/contextFrom (server only)
              layer = 1, outputBudget = supporting
        │
        ▼
generate primary → sanitize/review
        │
        ├── failure/abort → finish with existing failure behavior
        └── success → generate at most one supplement
                           using user context + primary reference text
        │
        ▼
existing expert_start/delta/done → client transcript
```

前端只能收到实际生成的专家消息。planner plan 事件即使继续存在，也不得包含 supplement reason、reference expert、score 或候选列表。

## Development steps

### Task 1: Lock the Phase 2A contract

**Files:** `src/domain/party/types.ts`, `src/domain/party/schema.ts`, related schema tests.

- 先写失败测试：允许 `supplementationRole: "none" | "integrator"`、`layer: 0 | 1`、supporting output budget 和 `referenceExpert`；拒绝 `challenger`、`layer > 1`、两个 supplement、无效 reference expert 和 primary budget 被错误用于 supplement。
- 保持 Phase 1 plan、PartyMessage、request history 和现有 responseRole 的兼容测试通过。
- 实现最小内部类型和 Zod 校验；不向客户端 PartyMessage 增加必填字段。
- 运行 party schema/type tests，并检查 TypeScript。

### Task 2: Add arrangement decision logic

**Files:** `src/server/party/party-perspective-supplementation.ts`, `src/server/party/conversation-arrangement-planner.ts`, planner tests.

- 先写失败测试：浅层输入（例如 `hi`、天气、简单闲聊）返回 no supplement；情绪原因/具体经历/内心冲突等信息丰富的输入，在有非重复用户价值时最多返回一个 supplement。
- 添加 artificial interaction test：即使当前轮已有多个 Phase 1 participant，也不能为了展示第二位专家而触发 supplement。
- 组合相关性、对话深度、最近参与历史和视角互补；保留 Phase 1 rotation/diversity policy。
- Phase 2A 仅生成 supporting voice 或 integrator，永不生成 challenger。
- 为 supplement 分配 supporting output budget，并确保候选 expert 不等于 primary。
- 运行 planner 单测和现有 Phase 1 planner 回归测试。

### Task 3: Update prompt contracts and output budgets

**Files:** `src/server/party/build-planner-messages.ts`, `src/server/party/build-expert-messages.ts`, prompt tests.

- 先写失败测试：planner 明确使用 perspective supplementation；浅层输入不触发；prompt 不使用“专家之间直接对话”作为目标；supplement prompt 包含只读 reference context、user-directed rule、Phase 2A role restriction 和 supporting budget。
- Primary 保持正常长度；supporting voice/integrator 使用明显较短的 token/character budget。
- 明确禁止“我同意某位专家”“回应某位专家”“他们刚才说”等 peer-chat 语言。
- 明确 B 不新增第二个开放问题，且不能复制 primary 的完整分析。
- 运行 prompt snapshot/string tests，确认单专家 prompt 没有变化。

### Task 4: Implement one-stage supplementation in the service

**Files:** `src/server/party/party-chat-service.ts`, new supplementation helper, service tests.

- 先写失败测试：primary 成功且 plan 有 supplement 时按 `primary → supplement` 串行生成；没有 supplement 时保持原 Phase 1 并行/顺序行为；不得生成第三层。
- 将 primary 输出作为受限、只读参考上下文传给 supplement。
- 对 supplement 做现有安全过滤、peer-language rejection、question budget 和 output budget 校验。
- supplement 失败/超时/被过滤时保留 primary，并正常结束本轮；不自动选择 C。
- abort 时同时取消尚未完成的 supplement，确保 session 可继续发送。
- 运行 service、SSE、failure、abort 和 multi-turn history tests。

### Task 5: Preserve the existing UI contract

**Files:** `src/components/chat/party-chat-workspace.tsx`, relevant UI tests/E2E.

- 先写失败测试：多一条 supplement 消息时仍使用现有专家消息布局；不渲染人数、reason、score、referenceExpert、contextFrom 或“正在回应某人”。
- 尽量只复用现有 expert events；若必须增加内部事件字段，客户端只读取展示所需字段。
- 验证用户可继续输入，streaming state、active plan、abort controller 和 messages 不因第二阶段生成卡住。
- 不修改 Homepage、单专家 ChatWorkspace 或单专家路由。
- 运行 PartyChatWorkspace 组件测试和 party E2E。

### Task 6: Phase 2A evaluation gate

**Files:** party tests, E2E fixtures, docs/changelog only if separately approved.

- 运行完整 lint、unit/component/integration tests、party E2E 和 build。
- 人工验证：浅层输入通常只有自然的一条回应；深入表达时可能出现一条明显较短的补充；用户不需要在两个问题之间作答。
- 验证七位专家人格差异、首轮多样性和多轮 rotation 没有回退。
- 确认 challenger 未启用、peer relation 未暴露、Phase 1 和单专家功能无改动。
- 通过人工审核后，才允许单独讨论 Phase 2B challenger；本计划不包含 Phase 2B 实现。

## Testing strategy

### Contract and planner tests

- Phase 2A 只允许 `supporting_voice` / `integrator`。
- `challenger`、多次 supplement、layer 2、错误 reference/context source 均被拒绝。
- Artificial interaction test：简单输入不因为“展示多人互动”而触发第二位专家。
- 触发必须有用户价值，且 supplement expert 与 primary 视角不重复。

### Prompt and quality tests

- Primary 正常长度；supplement 明显短于 primary。
- supplement 直接面向用户，不引用其他专家、不假装在讨论。
- 每轮最多一个开放式问题。
- 七位专家保持人格差异，不退化为通用心理咨询口吻。

### Runtime tests

- primary → supplement 顺序正确且最多两层。
- primary 失败、supplement 失败、过滤、超时和 abort 均可恢复。
- 第三轮及更深多轮 history 不因新增 context 而突破限制。
- SSE done/error 状态、browser messages、active plan 和 session status 一致。

### UI/E2E tests

- 现有消息布局继续显示中文名、色彩标记、正文、时间/生成状态。
- 不显示人数、未参与专家、planner reason、score、referenceExpert/contextFrom。
- 首页、单专家页面和单专家 API 回归测试保持通过。

## Review checkpoints

1. Task 1 后审核 Phase 2A contract，确认没有污染 Phase 1 客户端模型。
2. Task 2 后审核触发策略，重点检查 artificial interaction test 和首轮/多轮多样性。
3. Task 4 后审核服务端失败降级与第三层防护。
4. Task 6 后进行人工验收；未通过前不进入 Phase 2B。

本计划只覆盖 Phase 2A 的 expert perspective supplementation，不包含 challenger、专家多轮讨论、专家自主发言或 UI 关系可视化。
