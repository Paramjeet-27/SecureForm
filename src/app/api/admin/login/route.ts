import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readAppData } from "@/lib/appData";
import { deriveKey, unwrapKey, decrypt } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { token, passphrase } = await req.json();

  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid access." }, { status: 403 });
  }

  if (typeof passphrase !== "string" || passphrase.length === 0) {
    return NextResponse.json(
      { error: "Passphrase required." },
      { status: 400 },
    );
  }

  const appData = readAppData();
  const salt = Buffer.from(appData.adminPassphraseSalt, "base64");
  const adminKey = deriveKey(passphrase, salt);

  let dek: Buffer;
  try {
    dek = unwrapKey(appData.adminWrappedDEK, adminKey);
  } catch {
    return NextResponse.json(
      { error: "Incorrect passphrase." },
      { status: 401 },
    );
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  session.dek = dek.toString("base64");
  session.role = "admin";
  await session.save();

  return NextResponse.json({ success: true });
}
