import Link from "next/link";

type EducationalNoticeProps = {
  compact?: boolean;
};

export function EducationalNotice({ compact = false }: EducationalNoticeProps) {
  return (
    <aside aria-labelledby="educational-notice-title" className="safety-notice">
      <h2 id="educational-notice-title">
        {compact ? "使用边界" : "教育性角色模拟，不是临床服务"}
      </h2>
      <p>
        本工具把历史心理学家的公开理论整理为教育性角色模拟，用于学习、反思和学术讨论；它不是诊断、治疗或持牌临床服务。
      </p>
      <p>
        对话只保存在当前浏览器标签页中，刷新或关闭后会消失。发送给模型供应商的内容会用于生成本次回复，请避免输入身份证件、联系方式或其他敏感个人信息。
      </p>
      <Link className="inline-safety-link" href="/about">
        安全与隐私说明
      </Link>
    </aside>
  );
}
