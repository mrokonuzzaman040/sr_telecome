import { NextResponse } from "next/server";
import { query, supabaseUrl } from "@/lib/db";

export async function GET() {
  try {
    const res = await query("SELECT NOW() as current_time, current_database() as db_name");
    return NextResponse.json({
      status: "online",
      database: "Supabase PostgreSQL",
      host: supabaseUrl,
      dbName: res[0]?.db_name,
      serverTime: res[0]?.current_time,
      active: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "Supabase PostgreSQL",
        error: error?.message,
        active: false,
      },
      { status: 500 }
    );
  }
}
