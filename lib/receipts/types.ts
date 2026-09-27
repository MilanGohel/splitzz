import { Category } from "@/lib/zod/expense";

export interface LineItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  merchant: string;
  description: string;
  totalAmount: number;
  category: Category;
  date: string;
  lineItems: LineItem[];
  tax?: number;
  confidence?: number;
  rawText?: string;
  engine: "ai-vision" | "tesseract-ocr" | "heuristic";
}

export interface ParseReceiptInput {
  imageBuffer?: Buffer | null;
  base64Data?: string;
  fileName?: string;
  hintText?: string;
}
