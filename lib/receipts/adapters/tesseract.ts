import tesseract from "tesseract.js";

export interface OcrTextResult {
  text: string;
  confidence: number;
}

export async function recognizeWithTesseract(
  imageBuffer: Buffer
): Promise<OcrTextResult | null> {
  if (!imageBuffer || imageBuffer.length < 32) return null;

  try {
    const ocrResult = await tesseract.recognize(imageBuffer, "eng");
    if (ocrResult?.data?.text) {
      return {
        text: ocrResult.data.text.trim(),
        confidence: Math.round(ocrResult.data.confidence || 75),
      };
    }
  } catch (err: any) {
    console.warn("Tesseract OCR skipped (non-image buffer or decode issue):", err?.message);
  }

  return null;
}
