import {z} from "zod";

export const expenseInsertSchema = z.object({
    description: z.string().max(255).or(z.literal("")),
    totalAmount: z.int().positive(),
    paidBy: z.string().nonempty(),
    shares: z.array(z.object({
        userId: z.string().nonempty(),
        amount: z.int().positive()
    }))
})


export type ExpenseInsertSchema = z.infer<typeof expenseInsertSchema>;