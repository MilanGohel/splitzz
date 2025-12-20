import { z } from "zod";

export const settlementInsertSchema = z.object({
    fromUserId: z.string(),
    toUserId: z.string(),
    amount: z.number().positive(),
});

export type SettlementInsertInput = z.infer<typeof settlementInsertSchema>;