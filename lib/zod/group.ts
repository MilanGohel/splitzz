import { z } from "zod";

export const groupInsertSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(50),
    description: z.string().max(255).optional().or(z.literal("")),
});

export type GroupInsertInput = z.infer<typeof groupInsertSchema>;
