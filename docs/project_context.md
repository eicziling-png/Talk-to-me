# Talk to me 项目上下文

## 项目目标

Talk to me 是一个教育性角色模拟工具，让用户以自然聊天的方式与七位历史心理学思想家的思想传统相遇。系统应优先回应用户当前表达，其次才由专家人格影响关注角度和语言气质。

## 产品定位

- 产品名称：Talk to me
- 产品定位：进入一个安静的思想空间，与过去的声音进行对话。
- 不是诊断、治疗、临床服务，也不应把专家角色呈现为真实在世的治疗师或医生。
- 对话内容只保留在当前浏览器页面；刷新或关闭后不恢复会话。
- 当前支持七位专家：弗洛伊德、拉康、比昂、克莱因、温尼科特、科胡特、欧文·亚隆。

## 技术栈

- Next.js 16.2.10，App Router
- React 19.2.7、TypeScript 5.8.3
- Vinext 0.0.50 / Vite 8.0.13，用于当前 Sites 构建
- pnpm 11.7.0
- Zod 4.4.3，用于请求和专家配置校验
- Vitest 3.2.4、Testing Library、Playwright 1.54.2
- CSS 为主的视觉系统，核心样式集中在 `src/app/globals.css`
- Sites 部署配置位于 `.openai/hosting.json`；当前生产站点为 `https://talk-to-me-czl-psy.wjw9464.chatgpt.site`
- 模型接入通过通用 provider 接口，支持 OpenAI 与 OpenAI-compatible 服务（例如 DeepSeek）；密钥只允许配置在服务端环境变量中，不写入仓库。

## 页面结构与路由

当前构建列出的主要路由：

- `/`：Figma 风格静态 Homepage。包含水彩/油画主体、品牌标题、副标题、七位专家入口、`Let's party :)` 入口和安全说明。
- `/chat/[slug]`：单专家聊天页面。`slug` 由专家注册表校验，可接受受支持的对话模式参数。
- `/chat/party`：群聊 UI 外壳。目前只实现本地输入和页面结构，不调用真实多专家回复 API。
- `/about`：方法、隐私、安全和历史真实性等说明页面。
- `/api/chat`：服务端 POST 流式聊天接口，返回 SSE 文本流或稳定错误码。

不存在的旧流程不应被恢复：专家选择页和独立专家介绍页已被首页直接入口取代。

## 核心功能

- 七位专家的独立 profile、voice profile 和理论边界。
- 统一 Conversation Engine：理解当前消息、考虑近期历史、判断会话阶段，再使用专家人格表达。
- 三个对话阶段：首次简单问候、用户开始分享、持续深入探索。
- 安全分级 S0–S3；S2/S3 必须退出历史人物语气并提供现代安全支持，不调用模型。
- 服务端模型 provider 抽象、OpenAI-compatible 配置、流式输出、重试和压缩历史恢复。
- 浏览器内存会话、清空、重试、停止生成、Markdown/纯文本导出；不使用 localStorage、sessionStorage、IndexedDB 或 Cookie 保存聊天内容。
- 消息显示区独立滚动，专家消息和用户消息使用左右不同的显示 lane。
- Homepage 与 Chat 共用水彩背景和响应式空间逻辑，避免文字覆盖插画。

## 当前架构

```text
src/app/                 路由、页面和 /api/chat
src/components/chat/     聊天工作区、消息记录、输入框、导出
src/components/expert/   专家展示相关组件与文案
src/components/layout/   PaintingRoomLayout 等空间布局
src/domain/experts/      专家 schema、registry、profile、voice profile
src/domain/conversation/ 请求契约、浏览器会话、历史压缩、导出
src/domain/safety/       输入分级、危机响应、输出审核
src/server/orchestration/消息构建、Conversation Engine、聊天服务
src/server/models/       ModelProvider 接口与配置适配器
src/server/telemetry/    仅记录匿名指标，不记录完整消息
src/server/knowledge/    MVP 空知识 provider 边界
src/tests/               单元、组件、集成、E2E 和专家评估
public/figma/            当前 Figma 导出的图片和图标素材
```

## 不允许随意修改的部分

- 不要把角色改回“AI 助手/心理咨询报告”或让人格设定覆盖用户当前意图。
- 不要绕过安全分级、输出审核、危机退出和非临床免责声明。
- 不要把模型密钥、完整用户消息或完整助手消息写入日志、客户端或 Git。
- 不要恢复持久化聊天存储、账号系统、数据库、向量库、队列或多代理框架，除非另有明确设计和隐私评审。
- 不要随意改变 Figma 05 Sketch redesign 形成的水彩/油画空间、插画比例、Typography、色彩比例和响应式容器。
- 不要把 Homepage 改回专家列表页，也不要把 Chat 改成 ChatGPT/微信/SaaS 仪表盘样式。
- 不要在 `Let's party :)` 尚未接入真实群聊后端前暗示七位专家已经会自动共同回复。
- exact Figma token、字体文件授权和各生产环境模型配置的最终人工确认：需要人工确认。
