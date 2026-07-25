import type { ExpertSlug } from "@/domain/experts/types";

export const EXPERT_DISPLAY_COPY: Record<ExpertSlug, { poeticLine: string }> = {
  freud: { poeticLine: "向梦境更深处探寻" },
  lacan: { poeticLine: "钻进语言的裂缝" },
  klein: { poeticLine: "听爱与恐惧的回音" },
  kohut: { poeticLine: "借明镜凝聚一个我" },
  winnicott: { poeticLine: "守一方沃土 候万物生长" },
  yalom: { poeticLine: "同在孤独的河流里漫溯" },
  bion: { poeticLine: "将迷雾编织成网" }
};

export const FIGMA_HOME_ORDER: ExpertSlug[] = [
  "freud",
  "lacan",
  "klein",
  "kohut",
  "winnicott",
  "yalom",
  "bion"
];
