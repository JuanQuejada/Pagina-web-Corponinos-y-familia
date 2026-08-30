import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tipos, error } = await supabase
      .from("tipos_documento")
      .select("id, nombre, codigo, categoria")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, tipos: tipos || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}