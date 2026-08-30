import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/organizacion/areas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const soloActivas = searchParams.get("solo_activas");

    let query = supabase
      .from("areas")
      .select(`
        id,
        codigo,
        nombre,
        descripcion,
        orden,
        activo,
        editable,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .order("orden", { ascending: true, nullsFirst: false })
      .order("nombre", { ascending: true });

    if (soloActivas === "true") query = query.eq("activo", true);

    if (busqueda) {
      const termino = busqueda.replace(/[%_]/g, "\\$&");
      query = query.or(
        `nombre.ilike.%${termino}%,codigo.ilike.%${termino}%,descripcion.ilike.%${termino}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error listando áreas:", error);
      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar las áreas.", detalle: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error: any) {
    console.error("Error inesperado en GET /areas:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// POST /api/organizacion/areas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const codigo = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() || null : null;
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() || null : null;
    const orden = Number(body.orden) || 1;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!nombre) {
      return NextResponse.json({ ok: false, error: "El nombre del área es obligatorio." }, { status: 400 });
    }

    if (codigo) {
      const { data: existente, error } = await supabase
        .from("areas").select("id").eq("codigo", codigo).maybeSingle();
      if (error) throw error;
      if (existente) {
        return NextResponse.json({ ok: false, error: `Ya existe un área con el código ${codigo}.` }, { status: 409 });
      }
    }

    const { data: nombreExistente, error: nombreError } = await supabase
      .from("areas").select("id").eq("nombre", nombre).maybeSingle();
    if (nombreError) throw nombreError;
    if (nombreExistente) {
      return NextResponse.json({ ok: false, error: `Ya existe un área con el nombre "${nombre}".` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("areas")
      .insert({ codigo, nombre, descripcion, orden, activo })
      .select(`id,codigo,nombre,descripcion,orden,activo,editable,created_by,updated_by,created_at,updated_at`)
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, mensaje: "Área creada correctamente.", data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando área:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "No se pudo crear el área." },
      { status: 500 }
    );
  }
}
