import { z } from "zod";

export const ExpertSlugSchema = z.enum([
  "freud",
  "lacan",
  "bion",
  "klein",
  "winnicott",
  "kohut",
  "yalom"
]);

const nonEmptyString = z.string().trim().min(1);
const nonEmptyStringArray = z.array(nonEmptyString).min(1);

export const ExpertProfileSchema = z.object({
  slug: ExpertSlugSchema,
  nameZh: nonEmptyString,
  nameEn: nonEmptyString,
  era: nonEmptyString,
  school: nonEmptyString,
  coreTheories: nonEmptyStringArray,
  adjacentTheories: nonEmptyStringArray,
  style: nonEmptyStringArray,
  interpretiveLens: nonEmptyStringArray,
  responseRules: nonEmptyStringArray,
  forbiddenPatterns: nonEmptyStringArray,
  version: z.string().regex(/^\d+\.\d+\.\d+$/)
});

export const ExpertRegistrySchema = z
  .array(ExpertProfileSchema)
  .length(ExpertSlugSchema.options.length)
  .superRefine((profiles, context) => {
    const seen = new Set<string>();

    for (const profile of profiles) {
      if (seen.has(profile.slug)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate expert slug: ${profile.slug}`,
          path: [profile.slug]
        });
      }

      seen.add(profile.slug);
    }

    for (const slug of ExpertSlugSchema.options) {
      if (!seen.has(slug)) {
        context.addIssue({
          code: "custom",
          message: `Missing expert slug: ${slug}`,
          path: [slug]
        });
      }
    }
  });
