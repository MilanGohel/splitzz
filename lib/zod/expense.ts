import { z } from "zod";

export const CATEGORIES = [
  "general",
  "food",
  "groceries",
  "transportation",
  "utilities",
  "entertainment",
  "shopping",
  "travel",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const expenseInsertSchema = z.object({
  description: z
    .string({ message: "Description is required" })
    .min(3, "Description must be at least 3 characters")
    .max(255, "Description must be less than 255 characters"),
  totalAmount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive")
    .max(10000000, "Amount must be less than 10,000,000"),
  paidBy: z
    .string({ message: "Paid by is required" })
    .nonempty("Paid by is required"),
  shares: z
    .array(
      z.object({
        userId: z
          .string({ message: "User ID is required" })
          .nonempty("User ID for share is required"),
        shareAmount: z.number().positive("Share must be positive"),
      })
    )
    .min(1, "At least one person must be involved in the split"),
  category: z.string().optional().default("general"),
});

export type ExpenseInsertSchema = z.infer<typeof expenseInsertSchema>;
export type ExpenseInsertInput = z.input<typeof expenseInsertSchema>;
