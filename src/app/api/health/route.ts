import { NextResponse } from "next/server";

import { getAppEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "magazine-platform",
      environment: getAppEnvironment(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
