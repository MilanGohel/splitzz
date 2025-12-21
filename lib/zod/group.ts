import { z } from "zod";

export const groupInsertSchema = z.object({
    name: z.string({ message: "Group name is required" })
        .min(3, "Name must be at least 3 characters")
        .max(50, "Name must be less than 50 characters"),
    description: z.string().max(255, "Description must be less than 255 characters").optional().or(z.literal("")),
});

export type GroupInsertInput = z.infer<typeof groupInsertSchema>;
