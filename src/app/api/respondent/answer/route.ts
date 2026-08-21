import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readDataFile, writeDataFile } from "@/lib/datafile";
import { decrypt, encrypt } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "respondent") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { questionId, value } = await req.json();

  if (typeof questionId !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { meta, encrypted } = readDataFile() as any;
  const key = Buffer.from(session.dek, "base64");

  let data;
  try {
    data = JSON.parse(decrypt(encrypted, key));
  } catch {
    return NextResponse.json({ error: "Decryption failed." }, { status: 500 });
  }

  const question = data.questions[questionId];

  if (!question || !question.published) {
    // She can only answer questions that exist AND are published —
    // prevents answering drafts even via a direct API call.
    return NextResponse.json(
      { error: "Question not available." },
      { status: 404 },
    );
  }

  // Basic shape validation based on question type
  if (question.type === "mcq_multi" && !Array.isArray(value)) {
    return NextResponse.json(
      { error: "Expected an array for this question." },
      { status: 400 },
    );
  }
  if (question.type !== "mcq_multi" && typeof value !== "string") {
    return NextResponse.json(
      { error: "Expected a string for this question." },
      { status: 400 },
    );
  }
  if (
    (question.type === "mcq_single" && !question.options.includes(value)) ||
    (question.type === "mcq_multi" &&
      !value.every((v: string) => question.options.includes(v)))
  ) {
    return NextResponse.json(
      { error: "Invalid option selected." },
      { status: 400 },
    );
  }

  question.answer = {
    value,
    updatedAt: new Date().toISOString(),
  };

  const newEncrypted = encrypt(JSON.stringify(data), key);
  writeDataFile({ meta, encrypted: newEncrypted });

  return NextResponse.json({ success: true, answer: question.answer });
}
