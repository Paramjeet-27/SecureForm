import { NextResponse } from "next/server";
import { appDataFileExists, readAppData } from "@/lib/appData";

export async function GET() {
  if (!appDataFileExists()) {
    return NextResponse.json(
      { error: "Not initialized." },
      { status: 503 },
    );
  }

  const appData = readAppData();
  return NextResponse.json({
    theme: appData.theme,
    gradientAngle: appData.gradientAngle,
    icons: appData.icons,
  });
}
