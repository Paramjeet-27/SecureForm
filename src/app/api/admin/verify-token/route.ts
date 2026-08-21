import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const timingSafeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison to avoid length-based timing difference
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const expected = process.env.ADMIN_TOKEN ?? "";
  const valid = typeof token === "string" && timingSafeEqual(token, expected);
  return NextResponse.json({ valid });
}
