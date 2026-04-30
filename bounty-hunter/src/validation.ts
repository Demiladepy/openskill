import { z } from "zod";

export const runSchema = z.object({
  repo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "repo must look like owner/name"),
  prNumber: z.coerce.number().int().positive(),
  expectedAuthor: z.string().min(1),
  bountyTitle: z.string().min(3).max(120),
  requestedAmountUsd: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal")
});

export type RunInput = z.infer<typeof runSchema>;
