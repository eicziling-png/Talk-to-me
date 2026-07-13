import Link from "next/link";

import { CrisisNotice } from "@/components/safety/crisis-notice";
import { EducationalNotice } from "@/components/safety/educational-notice";

export default function AboutPage() {
  return (
    <main className="page-shell">
      <section aria-labelledby="about-title" className="page-hero">
        <p className="eyebrow">Safety, privacy, and method</p>
        <h1 id="about-title">安全与隐私说明</h1>
        <p className="lead">
          这里说明这个工具如何模拟历史心理学家的语言、如何处理对话、以及它不能承担哪些现实世界责任。
        </p>
        <Link className="back-link" href="/experts">
          返回专家列表
        </Link>
      </section>

      <div className="about-grid">
        <EducationalNotice />

        <section aria-labelledby="method-title" className="info-panel">
          <h2 id="method-title">方法论</h2>
          <p>
            每位人格都基于结构化资料卡：核心理论、常用概念、表达风格、解释视角和禁止模式。系统先应用安全边界，再把用户输入作为资料而不是指令交给模型。
          </p>
          <p>
            模拟会尽量呈现相应学派的提问方式和概念重心，但不会声称还原真实个人意识，也不会伪造私人谈话、未核实引文或现代临床资质。
          </p>
        </section>

        <section aria-labelledby="authenticity-title" className="info-panel">
          <h2 id="authenticity-title">历史真实性</h2>
          <p>
            历史真实性来自可维护的人格资料、版本化测试和人工评审，而不是让模型自由扮演。公开发布前仍需要版权、肖像、引用和心理学审阅逐项签署。
          </p>
        </section>

        <section aria-labelledby="privacy-title" className="info-panel">
          <h2 id="privacy-title">隐私与数据处理</h2>
          <p>
            MVP 不提供账号、数据库或默认保存。你的对话保留在当前浏览器标签页里，刷新或关闭后不会由应用恢复。
          </p>
          <p>
            为生成回复，当前输入和必要上下文会被发送给服务器端模型供应商处理。例行遥测只记录请求编号、耗时、结果、风险等级和匿名估算，不记录完整消息内容。
          </p>
        </section>

        <CrisisNotice />
      </div>
    </main>
  );
}
