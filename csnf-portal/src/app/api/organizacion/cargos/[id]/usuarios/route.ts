import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function errorRespuesta(
  error: string,
  status = 500,
  detalle?: string
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(detalle ? { detalle } : {}),
    },
    { status }
  );
}

// ============================================================
// GET /api/organizacion/cargos/[id]/usuarios
//
// Obtiene los usuarios que actualmente tienen asignado el cargo
// mediante usuarios.cargo_id.
//
// Esta consulta se realiza únicamente cuando se abre el detalle
// de un cargo, evitando cargar usuarios innecesariamente en la
// tabla principal de cargos.
// ============================================================

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    // ----------------------------------------------------------
    // Verificar que el cargo exista
    // ----------------------------------------------------------

    const { data: cargo, error: cargoError } = await supabase
      .from("cargos")
      .select("id, nombre")
      .eq("id", id)
      .maybeSingle();

    if (cargoError) {
      console.error(
        "Error verificando cargo en GET /cargos/[id]/usuarios:",
        cargoError
      );

      return errorRespuesta(
        "No se pudo verificar el cargo.",
        500,
        cargoError.message
      );
    }

    if (!cargo) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    // ----------------------------------------------------------
    // Obtener usuarios asignados directamente al cargo
    // ----------------------------------------------------------

    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuarios")
      .select(`
        id,
        nombres,
        apellidos,
        razon_social,
        email,
        numero_identificacion,
        telefono,
        foto_url,
        estado_usuario_id
      `)
      .eq("cargo_id", id)
      .order("nombres", { ascending: true, nullsFirst: false })
      .order("apellidos", { ascending: true, nullsFirst: false })
      .order("razon_social", { ascending: true, nullsFirst: false });

    if (usuariosError) {
      console.error(
        "Error obteniendo usuarios del cargo:",
        usuariosError
      );

      return errorRespuesta(
        "No se pudieron cargar los usuarios asignados al cargo.",
        500,
        usuariosError.message
      );
    }

    return NextResponse.json({
      ok: true,
      cargo: {
        id: cargo.id,
        nombre: cargo.nombre,
      },
      total: usuarios?.length ?? 0,
      data: usuarios ?? [],
    });
  } catch (error: any) {
    console.error(
      "Error inesperado en GET /api/organizacion/cargos/[id]/usuarios:",
      error
    );

    return errorRespuesta(
      error?.message || "Error interno del servidor.",
      500
    );
  }
}