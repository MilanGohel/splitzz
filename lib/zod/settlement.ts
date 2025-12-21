import { z } from "zod";

export const settlementInsertSchema = z.object({
    fromUserId: z.string({ message: "Payer ID is required" }),
    toUserId: z.string({ message: "Receiver ID is required" }),
    amount: z.number({ message: "Amount is required" }).positive("Amount must be positive"),
});

export type SettlementInsertInput = z.infer<typeof settlementInsertSchema>;