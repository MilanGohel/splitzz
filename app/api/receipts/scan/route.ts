import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { parseReceipt, ParsedReceipt, LineItem } from "@/lib/receipts";

export type { ParsedReceipt, LineItem };

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let fileName = "";
    let base64Data = "";
    let imageBuffer: Buffer | null = null;
    let hintText = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = (formData.get("image") || formData.get("file")) as File | null;

      if (!file) {
        return Response.json(
          { error: "No image file provided in form data" },
          { status: 400 }
        );
      }

      fileName = file.name || "receipt.jpg";
      hintText = fileName;

      try {
        const arrayBuf = await file.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        base64Data = imageBuffer.toString("base64");
      } catch {
        // Buffer read fallback
      }
    } else {
      const body = await request.json().catch(() => ({}));
      fileName = body.fileName || body.name || "receipt.jpg";
      base64Data = body.image || body.base64 || "";
      hintText = `${fileName} ${body.hint || ""}`.trim();

      if (base64Data) {
        try {
          const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
          imageBuffer = Buffer.from(cleanBase64, "base64");
        } catch {
          // Base64 decode fallback
        }
      }
    }

    const result = await parseReceipt({
      imageBuffer,
      base64Data,
      fileName,
      hintText,
    });

    return Response.json({
      success: true,
      data: result,
      receipt: result,
      ...result,
    });
  } catch (error: any) {
    console.error("Receipt scan error:", error);
    return Response.json(
      { error: error?.message || "Failed to parse receipt" },
      { status: 500 }
    );
  }
}
