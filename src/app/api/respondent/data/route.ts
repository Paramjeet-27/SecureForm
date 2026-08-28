import { NextResponse, NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readFormFile, formFileExists } from "@/lib/formFile";
import { decrypt } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "respondent") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formId = req.nextUrl.searchParams.get("formId");
  if (!formId) {
    return NextResponse.json({ error: "formId is required." }, { status: 400 });
  }
  if (!formFileExists(formId)) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const { encrypted } = readFormFile(formId);
  const key = Buffer.from(session.dek, "base64");

  let data;
  try {
    data = JSON.parse(decrypt(encrypted, key));
  } catch {
    return NextResponse.json({ error: "Decryption failed." }, { status: 500 });
  }

  const filtered: Record<string, any> = {};
  for (const [id, q] of Object.entries<any>(data.questions)) {
    if (q.published) {
      filtered[id] = q;
    }
  }

  return NextResponse.json({ questions: filtered });
}
