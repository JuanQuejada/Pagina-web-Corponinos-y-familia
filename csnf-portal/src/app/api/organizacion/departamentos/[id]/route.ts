import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  getProfileFromBearer,
} from "@/lib/document-domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// GET /api/organizacion/departamentos/[id]
// ============================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del departamento es obligatorio.",
        },
        { status: 400 }
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data,
      error,
    } = await supabase
      .from("departamentos")
      .select(`
        id,
        area_id,
        codigo,
        nombre,
        descripcion,
        activo,
        editable,
        orden,
        created_by,
        updated_by,
        created_at,
        updated_at,
        area:areas(
          id,
          codigo,
          nombre,
          activo
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El departamento no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error obteniendo departamento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/organizacion/departamentos/[id]
// ============================================================

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // --------------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------------

    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión no válida.",
        },
        { status: 401 }
      );
    }

    const usuarioId =
      actor.profile.id;

    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del departamento es obligatorio.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // OBTENER DEPARTAMENTO ACTUAL
    // --------------------------------------------------------

    const {
      data: actual,
      error: consultaError,
    } = await supabase
      .from("departamentos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (consultaError) {
      throw consultaError;
    }

    if (!actual) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El departamento no existe.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // PROTEGER NO EDITABLES
    // --------------------------------------------------------

    if (
      actual.editable === false
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este departamento no puede ser editado.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // NORMALIZAR
    // --------------------------------------------------------

    const areaId =
      typeof body.area_id ===
        "string" &&
      body.area_id
        ? body.area_id
        : actual.area_id;

    const codigo =
      typeof body.codigo ===
      "string"
        ? body.codigo.trim().toUpperCase() ||
          null
        : actual.codigo;

    const nombre =
      typeof body.nombre ===
      "string"
        ? body.nombre.trim()
        : actual.nombre;

    const descripcion =
      typeof body.descripcion ===
      "string"
        ? body.descripcion.trim() ||
          null
        : actual.descripcion;

    const orden =
      body.orden !== undefined
        ? Math.max(
            1,
            Number(body.orden) || 1
          )
        : actual.orden;

    const activo =
      typeof body.activo ===
      "boolean"
        ? body.activo
        : actual.activo;

    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (!areaId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El departamento debe pertenecer a un área.",
        },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El nombre del departamento es obligatorio.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // ÁREA
    // --------------------------------------------------------

    const {
      data: area,
      error: areaError,
    } = await supabase
      .from("areas")
      .select(
        "id,codigo,nombre,activo"
      )
      .eq("id", areaId)
      .maybeSingle();

    if (areaError) {
      throw areaError;
    }

    if (!area) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El área seleccionada no existe.",
        },
        { status: 404 }
      );
    }

    // No permitir departamento activo
    // dentro de área inactiva.
    if (
      !area.activo &&
      activo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede mantener activo un departamento dentro de un área inactiva.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // CÓDIGO DUPLICADO
    // --------------------------------------------------------

    if (codigo) {
      const {
        data: existente,
        error,
      } = await supabase
        .from("departamentos")
        .select("id")
        .eq("codigo", codigo)
        .neq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (existente) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Ya existe otro departamento con el código ${codigo}.`,
          },
          { status: 409 }
        );
      }
    }

    // --------------------------------------------------------
    // NOMBRE DUPLICADO DENTRO DEL ÁREA
    // --------------------------------------------------------

    const {
      data: nombreExistente,
      error: nombreError,
    } = await supabase
      .from("departamentos")
      .select("id")
      .eq(
        "area_id",
        areaId
      )
      .eq(
        "nombre",
        nombre
      )
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (nombreError) {
      throw nombreError;
    }

    if (nombreExistente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Ya existe un departamento llamado "${nombre}" en esta área.`,
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("departamentos")
      .update({
        area_id:
          areaId,

        codigo,

        nombre,

        descripcion,

        orden,

        activo,

        // USUARIO QUE HACE LA MODIFICACIÓN
        updated_by:
          usuarioId,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        id
      )
      .select(`
        id,
        area_id,
        codigo,
        nombre,
        descripcion,
        activo,
        editable,
        orden,
        created_by,
        updated_by,
        created_at,
        updated_at,
        area:areas(
          id,
          codigo,
          nombre,
          activo
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Departamento actualizado correctamente.",
      data,
    });
  } catch (error: any) {
    console.error(
      "Error actualizando departamento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}