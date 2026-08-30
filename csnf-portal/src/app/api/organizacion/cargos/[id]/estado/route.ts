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
  status: number,
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
// PATCH /api/organizacion/cargos/[id]/estado
//
// Body opcional:
//
// {
//   "activo": false
// }
//
// Si no se envía activo, alterna el estado actual.
// ============================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return errorRespuesta(
        "El ID del cargo es obligatorio.",
        400
      );
    }

    // --------------------------------------------------------
    // Obtener cargo
    // --------------------------------------------------------

    const {
      data: cargo,
      error: consultaError,
    } = await supabase
      .from("cargos")
      .select(`
        id,
        codigo,
        nombre,
        departamento_id,
        activo,
        editable
      `)
      .eq("id", id)
      .maybeSingle();

    if (consultaError) {
      throw consultaError;
    }

    if (!cargo) {
      return errorRespuesta(
        "El cargo no existe.",
        404
      );
    }

    // --------------------------------------------------------
    // Verificar editable
    // --------------------------------------------------------

    if (cargo.editable === false) {
      return errorRespuesta(
        "Este cargo no puede cambiar de estado.",
        403
      );
    }

    // --------------------------------------------------------
    // Determinar nuevo estado
    // --------------------------------------------------------

    const body = await request.json().catch(() => ({}));

    const nuevoEstado =
      typeof body.activo === "boolean"
        ? body.activo
        : !cargo.activo;

    // --------------------------------------------------------
    // Si se intenta desactivar:
    //
    // No permitir dejar cargos superiores inactivos mientras
    // otros cargos dependan jerárquicamente de ellos.
    // --------------------------------------------------------

    if (!nuevoEstado) {
      const {
        count: dependientes,
        error: dependientesError,
      } = await supabase
        .from("cargos")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("reporta_a", id)
        .eq("activo", true);

      if (dependientesError) {
        throw dependientesError;
      }

      if ((dependientes ?? 0) > 0) {
        return errorRespuesta(
          "No se puede desactivar el cargo porque existen cargos activos que reportan a él.",
          409,
          `Cargos dependientes activos: ${dependientes}`
        );
      }
    }

    // --------------------------------------------------------
    // Actualizar
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("cargos")
      .update({
        activo: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        codigo,
        nombre,
        activo,
        editable,
        updated_at
      `)
      .single();

    if (error) {
      console.error(
        "Error cambiando estado del cargo:",
        error
      );

      return errorRespuesta(
        "No se pudo cambiar el estado del cargo.",
        500,
        error.message
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: nuevoEstado
        ? "Cargo activado correctamente."
        : "Cargo desactivado correctamente.",
      data,
    });
  } catch (error: any) {
    console.error(
      "Error inesperado en PATCH /cargos/[id]/estado:",
      error
    );

    return errorRespuesta(
      error?.message ||
        "Error interno del servidor.",
      500
    );
  }
}