# Let's party 群聊入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Homepage 增加 `Let's party :)` 入口，并新增一个仅包含前端 UI 的群聊页面路由。

**Architecture:** Homepage 继续复用现有两列专家入口，只在右侧 Yalom 入口之后追加一个 party link，并通过独立的网格定位规则对齐到左侧 Bion。新增 `/chat/party` 路由使用独立的客户端群聊工作区组件，复用现有水彩背景、Composer、消息展示和响应式 Chat 容器，但不调用 `/api/chat`。

**Tech Stack:** Next.js App Router、React、TypeScript、现有 CSS、Vitest。

## Global Constraints

- 不修改现有专家数据、单专家聊天 API、单专家路由或专家页面。
- 不改变 Homepage 水彩插画、字体、颜色和已完成响应式规则。
- 新群聊当前只实现 UI 和路由结构，不实现真实多专家回复。
- 群聊页面必须复用当前 Chat page 的视觉语言和响应式容器。

---

### Task 1: Homepage party entry

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/tests/components/party-entry.test.tsx`

**Interfaces:**
- Consumes: existing `orderedExperts`, `leftColumn`, `rightColumn`, and `ExpertName` styles.
- Produces: an accessible `Link` with `href="/chat/party"`, `Let's party :)` label, and the existing gold dot asset.

- [ ] Write a failing test asserting the homepage renders `Let's party :)`, links to `/chat/party`, and keeps the existing expert links.
- [ ] Run the focused test and verify it fails because the party entry is absent.
- [ ] Add the new link after the Yalom entry without changing expert ordering; give it a dedicated class for vertical/horizontal alignment.
- [ ] Add only the alignment CSS needed to place the party entry below Yalom while aligning its left edge with Bion; include narrow-screen overrides so it remains inside the text column.
- [ ] Run the focused test and verify it passes.

### Task 2: Party chat route and UI shell

**Files:**
- Create: `src/app/chat/party/page.tsx`
- Create: `src/components/chat/party-chat-workspace.tsx`
- Modify: `src/app/globals.css`
- Test: `src/tests/components/party-chat-workspace.test.tsx`

**Interfaces:**
- Consumes: existing `Composer`, `Transcript`/message lane styling, `/figma/talk-to-me-homepage.png`, and `chat` responsive CSS patterns.
- Produces: a client-rendered `PartyChatWorkspace` with participant metadata, local-only messages, and no network request.

- [ ] Write a failing component test asserting `/chat/party` renders the party title, seven participant names, the existing composer, and does not call `/api/chat` on local submit.
- [ ] Run the focused test and verify it fails because the route/component does not exist.
- [ ] Implement the route page with `PartyChatWorkspace` and a stable participant list for Freud, Lacan, Bion, Klein, Winnicott, Kohut, and Yalom.
- [ ] Implement local-only message state: submitting text appends a user message; no expert reply or API request is generated yet.
- [ ] Reuse the existing art element, header/back/menu treatment, conversation scroll container, and composer structure; add only party-specific selectors for participant metadata.
- [ ] Add responsive party rules that inherit the existing `figma-chatpage` 1100px and 700px safe-panel behavior.
- [ ] Run the focused component test and verify it passes.

### Task 3: Regression, build, and deployment

**Files:**
- Modify: none beyond Tasks 1–2

**Interfaces:**
- Consumes: the completed Homepage entry and `/chat/party` route.
- Produces: a validated production deployment.

- [ ] Run the full Vitest suite and verify all existing single-expert tests remain green.
- [ ] Run the production build and verify all routes compile, including `/chat/party`.
- [ ] Push the exact commit to the configured Sites source branch, save a version, and deploy it.
- [ ] Verify the production URL responds successfully and report the new party route.
