import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Please attach a PDF file." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 20MB (received ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        },
        { status: 413 }
      );
    }

    // Check MIME type or file extension
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically import pdf-parse to keep it server-side only
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);

    return NextResponse.json({
      text: result.text,
      pageCount: result.numpages,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to parse PDF";
    return NextResponse.json(
      { error: `PDF parsing error: ${message}` },
      { status: 500 }
    );
  }
}
