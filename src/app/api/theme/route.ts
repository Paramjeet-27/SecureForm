import { NextResponse } from "next/server";
import { dataFileExists, readDataFile } from "@/lib/datafile";

export async function GET() {
  if (!dataFileExists()) {
    return NextResponse.json(
      { error: "Not initialized." },
      { status: 503 },
    );
  }

  const { meta } = readDataFile() as any;
  return NextResponse.json({
    theme: meta.theme,
    gradientAngle: meta.gradientAngle,
    icons: meta.icons,
  });
}
