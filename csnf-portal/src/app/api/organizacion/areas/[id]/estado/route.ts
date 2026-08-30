import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// PATCH /api/organizacion/areas/[id]/estado
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: "El ID del área es obligatorio." }, { status: 400 });

    const { data: area, error: consultaError } = await supabase.from("areas").select("id,codigo,nombre,activo,editable").eq("id", id).maybeSingle();
    if (consultaError) throw consultaError;
    if (!area) return NextResponse.json({ ok: false, error: "El área no existe." }, { status: 404 });
    if (area.editable === false) return NextResponse.json({ ok: false, error: "Esta área no puede cambiar de estado." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const nuevoEstado = typeof body.activo === "boolean" ? body.activo : !area.activo;

    if (!nuevoEstado) {
      const { count, error } = await supabase.from("departamentos").select("id", { count: "exact", head: true }).eq("area_id", id).eq("activo", true);
      if (error) throw error;
      if ((count ?? 0) > 0) return NextResponse.json({ ok: false, error: "No se puede desactivar el área porque tiene departamentos activos asociados.", detalle: `Departamentos activos encontrados: ${count}` }, { status: 409 });
    }

    const { data, error } = await supabase.from("areas").update({ activo: nuevoEstado, updated_at: new Date().toISOString() }).eq("id", id).select("id,codigo,nombre,activo,editable,updated_at").single();
    if (error) throw error;

    return NextResponse.json({ ok: true, mensaje: nuevoEstado ? "Área activada correctamente." : "Área desactivada correctamente.", data });
  } catch (error: any) {
    console.error("Error cambiando estado del área:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error interno del servidor." }, { status: 500 });
  }
}
