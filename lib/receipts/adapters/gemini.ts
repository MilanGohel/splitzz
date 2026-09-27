import { CATEGORIES, Category } from "@/lib/zod/expense";
import { ParsedReceipt } from "../types";

export async function parseWithGeminiVision(
  base64Data: string,
  apiKey: string
): Promise<ParsedReceipt | null> {
  if (!apiKey || !base64Data) return null;

  try {
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Analyze this receipt image. Extract merchant name, description, total amount (number), date (YYYY-MM-DD), category (food, groceries, transportation, utilities, entertainment, shopping, travel, general), and line items. Respond ONLY with valid JSON: {"merchant": string, "description": string, "totalAmount": number, "category": string, "date": string, "tax": number, "lineItems": [{"name": string, "price": number, "quantity": number}]}',
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) return null;

    const aiJson = await aiResponse.json();
    const content =
      aiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const cleanedJson = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    if (parsed && typeof parsed.totalAmount === "number") {
      const validCategory: Category = CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "general";

      return {
        merchant: parsed.merchant || "Receipt Merchant",
        description: parsed.description || parsed.merchant || "Scanned Receipt",
        totalAmount: parsed.totalAmount,
        category: validCategory,
        date: parsed.date || new Date().toISOString().split("T")[0],
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
        tax: typeof parsed.tax === "number" ? parsed.tax : undefined,
        confidence: 0.98,
        engine: "ai-vision",
      };
    }
  } catch (err) {
    console.warn("Gemini vision adapter warning:", err);
  }

  return null;
}
