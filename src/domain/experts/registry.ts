import { ExpertRegistrySchema } from "./schema";
import type { ExpertProfile, ExpertSlug } from "./types";
import { bionProfile } from "./profiles/bion";
import { freudProfile } from "./profiles/freud";
import { lacanProfile } from "./profiles/lacan";
import { kleinProfile } from "./profiles/klein";
import { kohutProfile } from "./profiles/kohut";
import { winnicottProfile } from "./profiles/winnicott";
import { yalomProfile } from "./profiles/yalom";

export const EXPERTS = ExpertRegistrySchema.parse([
  freudProfile,
  lacanProfile,
  bionProfile,
  kleinProfile,
  winnicottProfile,
  kohutProfile,
  yalomProfile
]).toSorted((left, right) => getBirthYear(left) - getBirthYear(right)) satisfies ExpertProfile[];

const expertsBySlug = new Map<ExpertSlug, ExpertProfile>(
  EXPERTS.map((expert) => [expert.slug, expert])
);

export function getExpert(slug: string): ExpertProfile | null {
  if (!isExpertSlug(slug)) {
    return null;
  }

  return expertsBySlug.get(slug) ?? null;
}

function isExpertSlug(slug: string): slug is ExpertSlug {
  return expertsBySlug.has(slug as ExpertSlug);
}

function getBirthYear(expert: ExpertProfile): number {
  return Number.parseInt(expert.era.split("-")[0] ?? "", 10);
}
