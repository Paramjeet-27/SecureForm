import { NextRequest, NextResponse } from "next/server";
import { dataFileExists, writeDataFile } from "@/lib/datafile";
import {
  generateSalt,
  deriveKey,
  encrypt,
  generateDataKey,
  wrapKey,
} from "@/lib/crypto";
import { hashPassphrase } from "@/lib/auth";
import { defaultIcons } from "@/iconOptions";

export async function POST(req: NextRequest) {
  if (dataFileExists()) {
    return NextResponse.json({ error: "Already set up." }, { status: 400 });
  }

  const { adminPassphrase, respondentPassphrase } = await req.json();

  if (
    typeof adminPassphrase !== "string" ||
    typeof respondentPassphrase !== "string" ||
    adminPassphrase.length < 8 ||
    respondentPassphrase.length < 8
  ) {
    return NextResponse.json(
      { error: "Both passphrases must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (adminPassphrase === respondentPassphrase) {
    return NextResponse.json(
      { error: "Passphrases must be different." },
      { status: 400 },
    );
  }

  if (!process.env.SERVER_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: SERVER_KEY missing." },
      { status: 500 },
    );
  }

  const adminPassphraseSalt = generateSalt();
  const serverKeySalt = generateSalt();
  const respondentPassphraseHash = await hashPassphrase(respondentPassphrase);

  const adminKey = deriveKey(adminPassphrase, adminPassphraseSalt);
  const serverKey = deriveKey(process.env.SERVER_KEY, serverKeySalt);

  const dek = generateDataKey();

  const encrypted = encrypt(JSON.stringify({ questions: {} }), dek);
  const adminWrappedDEK = wrapKey(dek, adminKey);
  const serverWrappedDEK = wrapKey(dek, serverKey);

  writeDataFile({
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      adminPassphraseSalt: adminPassphraseSalt.toString("base64"),
      serverKeySalt: serverKeySalt.toString("base64"),
      respondentPassphraseHash,
      adminWrappedDEK,
      serverWrappedDEK,
      theme: "calm",
      gradientAngle: null,
      icons: { ...defaultIcons },
    },
    encrypted,
  } as any);

  return NextResponse.json({ success: true });
}
