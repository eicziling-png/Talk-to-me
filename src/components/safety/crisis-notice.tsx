export type CrisisResource = {
  id: string;
  label: string;
  action: string;
  reviewedAt: string;
};

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: "local-emergency",
    label: "当地紧急服务",
    action: "如果你或他人正处于立即危险中，请离开应用并联系当地紧急服务。美国可拨打 911；其他地区请使用所在地官方紧急号码。",
    reviewedAt: "2026-07-13"
  },
  {
    id: "trusted-person",
    label: "身边可信任的人",
    action: "如果风险正在升高，请立刻联系身边可信任的人、医疗机构或学校/单位的线下支持渠道。",
    reviewedAt: "2026-07-13"
  }
];

export function CrisisNotice() {
  return (
    <aside aria-labelledby="crisis-notice-title" className="crisis-notice">
      <h2 id="crisis-notice-title">危机与紧急情况边界</h2>
      <p>
        这个应用无法联系急救、无法定位你，也不能替代现实世界中的紧急支持。危机提示和资源只来自部署前审核过的配置，不由模型临时生成。
      </p>
      <ul className="resource-list">
        {CRISIS_RESOURCES.map((resource) => (
          <li aria-label={resource.label} key={resource.id}>
            <strong>{resource.label}</strong>
            <span>{resource.action}</span>
            <small>配置审核日期：{resource.reviewedAt}</small>
          </li>
        ))}
      </ul>
    </aside>
  );
}
