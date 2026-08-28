import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readAppData } from "@/lib/appData";
import { deriveKey, unwrapKey } from "@/lib/crypto";
import { verifyPassphrase } from "@/lib/auth";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { token, passphrase } = await req.json();

  if (token !== process.env.RESPONDENT_TOKEN) {
    return NextResponse.json({ error: "Invalid access." }, { status: 403 });
  }

  if (typeof passphrase !== "string" || passphrase.length === 0) {
    return NextResponse.json(
      { error: "Passphrase required." },
      { status: 400 },
    );
  }

  if (!process.env.SERVER_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured." },
      { status: 500 },
    );
  }

  const appData = readAppData();

  const ok = await verifyPassphrase(passphrase, appData.respondentPassphraseHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Incorrect passphrase." },
      { status: 401 },
    );
  }

  const serverKeySalt = Buffer.from(appData.serverKeySalt, "base64");
  const serverKey = deriveKey(process.env.SERVER_KEY, serverKeySalt);

  let dek: Buffer;
  try {
    dek = unwrapKey(appData.serverWrappedDEK, serverKey);
  } catch {
    return NextResponse.json(
      { error: "Server decryption error." },
      { status: 500 },
    );
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  session.dek = dek.toString("base64");
  session.role = "respondent";
  await session.save();

  return NextResponse.json({ success: true });
}
