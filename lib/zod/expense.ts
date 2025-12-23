import { z } from "zod";

export const expenseInsertSchema = z.object({
  description: z
    .string({ message: "Description is required" })
    .min(3, "Description must be at least 3 characters")
    .max(255, "Description must be less than 255 characters"),
  totalAmount: z
    .number({ message: "Amount is required" })
    .int("Amount must be an integer (cents)")
    .positive("Amount must be positive"),
  paidBy: z
    .string({ message: "Paid by is required" })
    .nonempty("Paid by is required"),
  shares: z
    .array(
      z.object({
        userId: z
          .string({ message: "User ID is required" })
          .nonempty("User ID for share is required"),
        shareAmount: z.number().min(0, "Share cannot be negative"),
      })
    )
    .min(1, "At least one person must be involved in the split"),
});

export type ExpenseInsertSchema = z.infer<typeof expenseInsertSchema>;
