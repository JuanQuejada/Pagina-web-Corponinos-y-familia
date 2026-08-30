import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ajusta "usuarios" por el nombre real de tu tabla de usuarios en Supabase (ej: "profiles", "users", etc.)
    const { data: usuarios, error } = await supabase
      .from("usuarios") 
      .select("id, nombres, apellidos, razon_social, email");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, usuarios: usuarios || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}