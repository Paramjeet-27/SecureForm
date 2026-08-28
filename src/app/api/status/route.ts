import { NextResponse } from "next/server";
import { appDataFileExists } from "@/lib/appData";

export async function GET() {
  return NextResponse.json({ initialized: appDataFileExists() });
}
