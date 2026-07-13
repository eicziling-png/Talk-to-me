import type { ExpertSlug } from "@/domain/experts/types";

export type KnowledgeItem = {
  title: string;
  content: string;
  source?: {
    label: string;
    url?: string;
  };
};

export type KnowledgeProvider = {
  search(expert: ExpertSlug, query: string): Promise<KnowledgeItem[]>;
};
