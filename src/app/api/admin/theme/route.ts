import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readDataFile, writeDataFile } from "@/lib/datafile";
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

  const { meta } = readDataFile() as any;
  return NextResponse.json({
    theme: meta.theme,
    gradientAngle: meta.gradientAngle,
    icons: meta.icons,
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

  const { meta, encrypted } = readDataFile() as any;

  if (theme !== undefined) {
    if (!(theme in themes)) {
      return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
    }
    meta.theme = theme;
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
    meta.gradientAngle = gradientAngle;
  }

  if (icons !== undefined) {
    for (const [slot, iconName] of Object.entries(icons)) {
      if (!((iconName as string) in iconOptions)) {
        return NextResponse.json(
          { error: `Unknown icon: ${iconName}` },
          { status: 400 },
        );
      }
      meta.icons[slot] = iconName;
    }
  }

  writeDataFile({ meta, encrypted });

  return NextResponse.json({
    success: true,
    theme: meta.theme,
    gradientAngle: meta.gradientAngle,
    icons: meta.icons,
  });
}
