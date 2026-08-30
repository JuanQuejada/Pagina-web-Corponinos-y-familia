import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// GET /api/organizacion/departamentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const areaId = searchParams.get("area_id");
    const soloActivos = searchParams.get("solo_activos");

    let query = supabase.from("departamentos").select(`
      id,area_id,codigo,nombre,descripcion,activo,editable,orden,created_by,updated_by,created_at,updated_at,
      area:areas(id,codigo,nombre,activo)
    `).order("orden", { ascending: true, nullsFirst: false }).order("nombre", { ascending: true });

    if (areaId) query = query.eq("area_id", areaId);
    if (soloActivos === "true") query = query.eq("activo", true);
    if (busqueda) {
      const termino = busqueda.replace(/[%_]/g, "\\$&");
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error: any) {
    console.error("Error listando departamentos:", error);
    return NextResponse.json({ ok: false, error: error.message || "No se pudieron cargar los departamentos." }, { status: 500 });
  }
}

// POST /api/organizacion/departamentos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const areaId = typeof body.area_id === "string" ? body.area_id : "";
    const codigo = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() || null : null;
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() || null : null;
    const orden = Number(body.orden) || 1;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!areaId) return NextResponse.json({ ok: false, error: "El departamento debe pertenecer a un área." }, { status: 400 });
    if (!nombre) return NextResponse.json({ ok: false, error: "El nombre del departamento es obligatorio." }, { status: 400 });

    const { data: area, error: areaError } = await supabase.from("areas").select("id,activo").eq("id", areaId).maybeSingle();
    if (areaError) throw areaError;
    if (!area) return NextResponse.json({ ok: false, error: "El área seleccionada no existe." }, { status: 404 });
    if (!area.activo) return NextResponse.json({ ok: false, error: "No se puede crear un departamento dentro de un área inactiva." }, { status: 400 });
    if (!activo) { /* permitido: puede crearse inactivo dentro de un área activa */ }

    if (codigo) {
      const { data: existente, error } = await supabase.from("departamentos").select("id").eq("codigo", codigo).maybeSingle();
      if (error) throw error;
      if (existente) return NextResponse.json({ ok: false, error: `Ya existe un departamento con el código ${codigo}.` }, { status: 409 });
    }

    const { data: nombreExistente, error: nombreError } = await supabase.from("departamentos").select("id").eq("area_id", areaId).eq("nombre", nombre).maybeSingle();
    if (nombreError) throw nombreError;
    if (nombreExistente) return NextResponse.json({ ok: false, error: `Ya existe un departamento llamado "${nombre}" en esta área.` }, { status: 409 });

    const { data, error } = await supabase.from("departamentos").insert({ area_id: areaId, codigo, nombre, descripcion, orden, activo }).select(`
      id,area_id,codigo,nombre,descripcion,activo,editable,orden,created_by,updated_by,created_at,updated_at,
      area:areas(id,codigo,nombre,activo)
    `).single();
    if (error) throw error;

    return NextResponse.json({ ok: true, mensaje: "Departamento creado correctamente.", data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando departamento:", error);
    return NextResponse.json({ ok: false, error: error.message || "No se pudo crear el departamento." }, { status: 500 });
  }
}