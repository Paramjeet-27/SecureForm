import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readDataFile, writeDataFile } from "@/lib/datafile";
import { decrypt, encrypt } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { type, text, options } = await req.json();

  const validTypes = ["short_text", "long_text", "mcq_single", "mcq_multi"];
  if (
    !validTypes.includes(type) ||
    typeof text !== "string" ||
    text.trim() === ""
  ) {
    return NextResponse.json(
      { error: "Invalid question data." },
      { status: 400 },
    );
  }

  const needsOptions = type === "mcq_single" || type === "mcq_multi";
  if (needsOptions && (!Array.isArray(options) || options.length < 2)) {
    return NextResponse.json(
      { error: "MCQ questions need at least 2 options." },
      { status: 400 },
    );
  }

  const { meta, encrypted } = readDataFile();
  const key = Buffer.from(session.dek, "base64");

  let data;
  try {
    data = JSON.parse(decrypt(encrypted, key));
  } catch {
    return NextResponse.json({ error: "Decryption failed." }, { status: 500 });
  }

  const id = `q_${crypto.randomBytes(4).toString("hex")}`;
  const existingCount = Object.keys(data.questions).length;

  data.questions[id] = {
    type,
    text: text.trim(),
    options: needsOptions ? options : null,
    published: false,
    order: existingCount + 1,
    answer: null,
  };

  const newEncrypted = encrypt(JSON.stringify(data), key);
  writeDataFile({ meta, encrypted: newEncrypted });

  return NextResponse.json({ success: true, id, question: data.questions[id] });
}

export async function PATCH(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id, updates, clearAnswer, renamedAnswerValue } = await req.json();

  if (
    typeof id !== "string" ||
    typeof updates !== "object" ||
    updates === null
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { meta, encrypted } = readDataFile();
  const key = Buffer.from(session.dek, "base64");

  let data;
  try {
    data = JSON.parse(decrypt(encrypted, key));
  } catch {
    return NextResponse.json({ error: "Decryption failed." }, { status: 500 });
  }

  if (!data.questions[id]) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if ("type" in updates) {
    const validTypes = ["short_text", "long_text", "mcq_single", "mcq_multi"];
    if (!validTypes.includes(updates.type)) {
      return NextResponse.json(
        { error: "Invalid question type." },
        { status: 400 },
      );
    }
  }

  // Only allow updating specific fields — never let the client overwrite `answer` here
  const allowedFields = ["type", "text", "options", "published", "order"];
  for (const field of allowedFields) {
    if (field in updates) {
      data.questions[id][field] = updates[field];
    }
  }

  if (clearAnswer === true) {
    data.questions[id].answer = null;
  } else if (renamedAnswerValue !== undefined) {
    const currentType = data.questions[id].type;
    const isMcq = currentType === "mcq_single" || currentType === "mcq_multi";
    if (isMcq && data.questions[id].answer) {
      data.questions[id].answer = { value: renamedAnswerValue };
    }
  }

  const newEncrypted = encrypt(JSON.stringify(data), key);
  writeDataFile({ meta, encrypted: newEncrypted });

  return NextResponse.json({ success: true, question: data.questions[id] });
}

export async function DELETE(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await req.json();

  if (typeof id !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { meta, encrypted } = readDataFile();
  const key = Buffer.from(session.dek, "base64");

  let data;
  try {
    data = JSON.parse(decrypt(encrypted, key));
  } catch {
    return NextResponse.json({ error: "Decryption failed." }, { status: 500 });
  }

  if (!data.questions[id]) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  delete data.questions[id];

  const newEncrypted = encrypt(JSON.stringify(data), key);
  writeDataFile({ meta, encrypted: newEncrypted });

  return NextResponse.json({ success: true });
}
