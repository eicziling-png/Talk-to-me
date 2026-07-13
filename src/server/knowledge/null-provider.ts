import type { ExpertSlug } from "@/domain/experts/types";

import type { KnowledgeItem, KnowledgeProvider } from "./types";

export class NullKnowledgeProvider implements KnowledgeProvider {
  async search(_expert: ExpertSlug, _query: string): Promise<KnowledgeItem[]> {
    return [];
  }
}

export const nullKnowledgeProvider = new NullKnowledgeProvider();
