import { supabaseAdmin, jsonOk, jsonError } from "@/lib/document-domain";

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("repositorios")
      .select("id,nombre,descripcion,activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) return jsonError(error.message, 500);
    return jsonOk({ repositorios: data || [] });
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible listar repositorios.", 500);
  }
}
