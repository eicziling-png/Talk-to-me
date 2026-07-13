import type { z } from "zod";

import type { ExpertProfileSchema, ExpertSlugSchema } from "./schema";

export type ExpertSlug = z.infer<typeof ExpertSlugSchema>;
export type ExpertProfile = z.infer<typeof ExpertProfileSchema>;
