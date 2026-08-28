import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import {
  readFormsIndex,
  addFormToIndex,
  renameFormInIndex,
  removeFormFromIndex,
} from "@/lib/formsIndex";
import { writeFormFile, deleteFormFile } from "@/lib/formFile";
import { encrypt, generateFormId } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { forms } = readFormsIndex();
  // Sorted by creation order so tabs render in a stable, predictable sequence.
  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { title } = await req.json().catch(() => ({}));

  const trimmedTitle =
    typeof title === "string" && title.trim() ? title.trim() : "Untitled Form";

  const key = Buffer.from(session.dek, "base64");
  const id = generateFormId();
  const createdAt = new Date().toISOString();

  const encrypted = encrypt(JSON.stringify({ questions: {} }), key);

  writeFormFile(id, {
    version: 1,
    createdAt,
    encrypted,
  });

  addFormToIndex({ id, title: trimmedTitle, createdAt });

  return NextResponse.json(
    { success: true, id, title: trimmedTitle, createdAt },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { formId, title } = await req.json().catch(() => ({}));

  if (typeof formId !== "string" || !formId) {
    return NextResponse.json({ error: "formId is required." }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const renamed = renameFormInIndex(formId, title.trim());
  if (!renamed) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, title: title.trim() });
}

export async function DELETE(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { formId } = await req.json().catch(() => ({}));

  if (typeof formId !== "string" || !formId) {
    return NextResponse.json({ error: "formId is required." }, { status: 400 });
  }

  // Remove from the index first — if this fails, the form file still exists
  // and nothing is lost. If the file delete below fails after this succeeds,
  // we're left with an orphaned file but no dangling index entry pointing
  // at missing data (safer failure mode than the reverse).
  const removed = removeFormFromIndex(formId);
  if (!removed) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  deleteFormFile(formId);

  return NextResponse.json({ success: true });
}
