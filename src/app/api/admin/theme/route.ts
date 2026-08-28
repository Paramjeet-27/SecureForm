import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readAppData, writeAppData } from "@/lib/appData";
import { sessionOptions, SessionData } from "@/lib/session";
import { themes } from "@/themes";
import { iconOptions } from "@/iconOptions";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  if (!session.dek) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const appData = readAppData();
  return NextResponse.json({
    theme: appData.theme,
    gradientAngle: appData.gradientAngle,
    icons: appData.icons,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  if (!session.dek || session.role !== "admin") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { theme, gradientAngle, icons } = await req.json();

  const appData = readAppData();

  if (theme !== undefined) {
    if (!(theme in themes)) {
      return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
    }
    appData.theme = theme;
  }

  if (gradientAngle !== undefined) {
    if (
      gradientAngle !== null &&
      (typeof gradientAngle !== "number" ||
        gradientAngle < 0 ||
        gradientAngle > 360)
    ) {
      return NextResponse.json(
        { error: "Angle must be 0-360." },
        { status: 400 },
      );
    }
    appData.gradientAngle = gradientAngle;
  }

  if (icons && typeof icons === "object") {
    for (const [slot, iconName] of Object.entries(icons as Record<string, unknown>)) {
      if (typeof iconName !== "string" || !(iconName in iconOptions)) {
        return NextResponse.json(
          { error: `Unknown icon: ${iconName}` },
          { status: 400 },
        );
      }
      appData.icons[slot] = iconName;
    }
  }

  writeAppData(appData);

  return NextResponse.json({
    success: true,
    theme: appData.theme,
    gradientAngle: appData.gradientAngle,
    icons: appData.icons,
  });
}
