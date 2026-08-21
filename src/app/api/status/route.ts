import { NextResponse } from "next/server";
import { dataFileExists } from "@/lib/datafile";

export async function GET() {
  return NextResponse.json({ initialized: dataFileExists() });
}
