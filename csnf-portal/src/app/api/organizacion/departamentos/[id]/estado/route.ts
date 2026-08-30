import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// PATCH /api/organizacion/departamentos/[id]/estado
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: "El ID del departamento es obligatorio." }, { status: 400 });

    const { data: depto, error: consultaError } = await supabase.from("departamentos").select(`
      id,area_id,codigo,nombre,activo,editable,area:areas(id,codigo,nombre,activo)
    `).eq("id", id).maybeSingle();
    if (consultaError) throw consultaError;
    if (!depto) return NextResponse.json({ ok: false, error: "El departamento no existe." }, { status: 404 });
    if (depto.editable === false) return NextResponse.json({ ok: false, error: "Este departamento no puede cambiar de estado." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const nuevoEstado = typeof body.activo === "boolean" ? body.activo : !depto.activo;

    if (nuevoEstado) {
      const area = Array.isArray(depto.area) ? depto.area[0] : depto.area;
      if (!area) return NextResponse.json({ ok: false, error: "El departamento no tiene un área válida asociada." }, { status: 409 });
      if (!area.activo) return NextResponse.json({ ok: false, error: "No se puede activar el departamento porque el área a la que pertenece está inactiva." }, { status: 409 });
    }

    const { data, error } = await supabase.from("departamentos").update({ activo: nuevoEstado, updated_at: new Date().toISOString() }).eq("id", id).select(`
      id,area_id,codigo,nombre,activo,editable,orden,updated_at,area:areas(id,codigo,nombre,activo)
    `).single();
    if (error) throw error;

    return NextResponse.json({ ok: true, mensaje: nuevoEstado ? "Departamento activado correctamente." : "Departamento desactivado correctamente.", data });
  } catch (error: any) {
    console.error("Error cambiando estado del departamento:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error interno del servidor." }, { status: 500 });
  }
}