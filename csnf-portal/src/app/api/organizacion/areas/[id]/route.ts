import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  getProfileFromBearer,
} from "@/lib/document-domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// GET /api/organizacion/areas/[id]
// ============================================================

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "El ID del área es obligatorio.",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    const {
      data,
      error,
    } = await supabase
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
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "El área no existe.",
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
      "Error obteniendo área:",
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
// PUT /api/organizacion/areas/[id]
// ============================================================

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
            "El ID del área es obligatorio.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const supabase =
      supabaseAdmin();

    // --------------------------------------------------------
    // OBTENER ÁREA ACTUAL
    // --------------------------------------------------------

    const {
      data: actual,
      error: consultaError,
    } = await supabase
      .from("areas")
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
          error: "El área no existe.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // PROTEGER ÁREAS NO EDITABLES
    // --------------------------------------------------------

    if (
      actual.editable === false
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta área no puede ser editada.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // NORMALIZAR DATOS
    // --------------------------------------------------------

    const codigo =
      typeof body.codigo === "string"
        ? body.codigo.trim().toUpperCase() ||
          null
        : actual.codigo;

    const nombre =
      typeof body.nombre === "string"
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
    // VALIDAR NOMBRE
    // --------------------------------------------------------

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El nombre del área es obligatorio.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // VALIDAR CÓDIGO DUPLICADO
    // --------------------------------------------------------

    if (codigo) {
      const {
        data: existente,
        error,
      } = await supabase
        .from("areas")
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
              `Ya existe otra área con el código ${codigo}.`,
          },
          { status: 409 }
        );
      }
    }

    // --------------------------------------------------------
    // VALIDAR NOMBRE DUPLICADO
    // --------------------------------------------------------

    const {
      data: nombreExistente,
      error: nombreError,
    } = await supabase
      .from("areas")
      .select("id")
      .eq("nombre", nombre)
      .neq("id", id)
      .maybeSingle();

    if (nombreError) {
      throw nombreError;
    }

    if (nombreExistente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Ya existe otra área con el nombre "${nombre}".`,
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // ACTUALIZAR
    //
    // IMPORTANTE:
    // updated_by identifica al usuario real que hizo
    // la modificación.
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("areas")
      .update({
        codigo,
        nombre,
        descripcion,
        orden,
        activo,

        updated_by:
          usuarioId,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
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
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Área actualizada correctamente.",
      data,
    });
  } catch (error: any) {
    console.error(
      "Error actualizando área:",
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