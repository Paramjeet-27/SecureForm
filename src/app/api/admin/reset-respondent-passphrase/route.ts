import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readDataFile, writeDataFile } from "@/lib/datafile";
import { hashPassphrase } from "@/lib/auth";
import { deriveKey, unwrapKey, decrypt } from "@/lib/crypto";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { currentAdminPassphrase, newPassphrase } = await req.json();

  if (
    typeof currentAdminPassphrase !== "string" ||
    currentAdminPassphrase.length === 0
  ) {
    return NextResponse.json(
      { error: "Current admin passphrase required." },
      { status: 400 },
    );
  }

  if (typeof newPassphrase !== "string" || newPassphrase.length < 8) {
    return NextResponse.json(
      { error: "New passphrase must be at least 8 characters." },
      { status: 400 },
    );
  }

  const { meta, encrypted } = readDataFile() as any;

  // Step-up re-verification: prove the caller actually knows the admin
  // passphrase right now, not just that their session cookie is still valid.
  const salt = Buffer.from(meta.adminPassphraseSalt, "base64");
  const adminKey = deriveKey(currentAdminPassphrase, salt);

  try {
    const dek = unwrapKey(meta.adminWrappedDEK, adminKey);
    decrypt(encrypted, dek);
  } catch {
    return NextResponse.json(
      { error: "Incorrect admin passphrase." },
      { status: 401 },
    );
  }

  if (newPassphrase === currentAdminPassphrase) {
    return NextResponse.json(
      { error: "Respondent passphrase must differ from the admin passphrase." },
      { status: 400 },
    );
  }

  const newHash = await hashPassphrase(newPassphrase);
  meta.respondentPassphraseHash = newHash;

  writeDataFile({ meta, encrypted });

  return NextResponse.json({ success: true });
}
