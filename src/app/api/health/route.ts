import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({
      status: "healthy",
      service: "SR Telecom & Library ERP",
      timestamp: new Date().toISOString(),
      active: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "SR Telecom & Library ERP",
        active: false,
      },
      { status: 503 }
    );
  }
}
