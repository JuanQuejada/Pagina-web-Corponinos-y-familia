import { NextRequest } from "next/server";

import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

/* ============================================================
   TIPOS
============================================================ */

type AnyRecord = Record<string, any>;

function texto(value: unknown): string {
  return String(value ?? "").trim();
}

function errorMessage(error: any): string {
  return (
    error?.message ||
    "Error inesperado."
  );
}

/* ============================================================
   GET
============================================================ */

/**
 * GET /api/roles-permisos
 *
 * Devuelve:
 *
 * roles
 * permisos
 *
 * Si se recibe:
 *
 * ?rol_id=UUID
 *
 * también devuelve:
 *
 * permisos_asignados
 */
export async function GET(
  request: NextRequest
) {
  try {
    /* ----------------------------------------------------------
       AUTENTICACIÓN
    ---------------------------------------------------------- */

    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const supabase =
      supabaseAdmin();

    const url =
      new URL(request.url);

    const rolId =
      texto(
        url.searchParams.get(
          "rol_id"
        )
      );

    /* ----------------------------------------------------------
       ROLES
    ---------------------------------------------------------- */

    const {
      data: roles,
      error: rolesError,
    } = await supabase
      .from("roles")
      .select(`
        id,
        nombre,
        codigo,
        descripcion,
        nivel,
        permisos,
        activo,
        orden,
        editable,
        created_at
      `)
      .order(
        "orden",
        {
          ascending: true,
        }
      )
      .order(
        "nombre",
        {
          ascending: true,
        }
      );

    if (rolesError) {
      return jsonError(
        rolesError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       PERMISOS
    ---------------------------------------------------------- */

    const {
      data: permisos,
      error: permisosError,
    } = await supabase
      .from("permisos")
      .select(`
        id,
        codigo,
        modulo,
        accion,
        descripcion,
        activo,
        modulo_id,
        created_at,
        updated_at
      `)
      .eq(
        "activo",
        true
      )
      .order(
        "modulo",
        {
          ascending: true,
        }
      )
      .order(
        "accion",
        {
          ascending: true,
        }
      );

    if (permisosError) {
      return jsonError(
        permisosError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       PERMISOS DEL ROL
    ---------------------------------------------------------- */

    let permisosAsignados: string[] =
      [];

    if (rolId) {
      const {
        data: relaciones,
        error:
          relacionesError,
      } = await supabase
        .from(
          "roles_permisos"
        )
        .select(
          "rol_id,permiso_id"
        )
        .eq(
          "rol_id",
          rolId
        );

      if (relacionesError) {
        return jsonError(
          relacionesError.message,
          500
        );
      }

      permisosAsignados =
        Array.from(
          new Set(
            (
              relaciones ||
              []
            )
              .map(
                (item) =>
                  item.permiso_id
              )
              .filter(Boolean)
          )
        );
    }

    /* ----------------------------------------------------------
       RESPUESTA
    ---------------------------------------------------------- */

    return jsonOk({
      roles:
        roles || [],

      permisos:
        permisos || [],

      permisos_asignados:
        permisosAsignados,

      rol_id:
        rolId || null,
    });
  } catch (error: any) {
    console.error(
      "GET /api/roles-permisos:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   POST
============================================================ */

/**
 * POST /api/roles-permisos
 *
 * Crea un nuevo rol.
 *
 * Body:
 *
 * {
 *   nombre,
 *   codigo,
 *   descripcion,
 *   nivel,
 *   activo,
 *   orden,
 *   editable
 * }
 */
export async function POST(
  request: NextRequest
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    let body: AnyRecord;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const nombre =
      texto(
        body.nombre
      );

    const codigo =
      texto(
        body.codigo
      ).toUpperCase();

    const descripcion =
      texto(
        body.descripcion
      ) || null;

    const nivel =
      Number.isFinite(
        Number(body.nivel)
      )
        ? Number(body.nivel)
        : 1;

    const orden =
      Number.isFinite(
        Number(body.orden)
      )
        ? Number(body.orden)
        : 1;

    const activo =
      body.activo !== false;

    const editable =
      body.editable !== false;

    if (!nombre) {
      return jsonError(
        "El nombre del rol es obligatorio.",
        400
      );
    }

    if (!codigo) {
      return jsonError(
        "El código del rol es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    /* ----------------------------------------------------------
       DUPLICADOS
    ---------------------------------------------------------- */

    const {
      data: existenteCodigo,
    } = await supabase
      .from("roles")
      .select("id")
      .eq(
        "codigo",
        codigo
      )
      .maybeSingle();

    if (existenteCodigo) {
      return jsonError(
        "Ya existe un rol con ese código.",
        409
      );
    }

    const {
      data: existenteNombre,
    } = await supabase
      .from("roles")
      .select("id")
      .eq(
        "nombre",
        nombre
      )
      .maybeSingle();

    if (existenteNombre) {
      return jsonError(
        "Ya existe un rol con ese nombre.",
        409
      );
    }

    /* ----------------------------------------------------------
       CREAR
    ---------------------------------------------------------- */

    const {
      data: rol,
      error,
    } = await supabase
      .from("roles")
      .insert({
        nombre,
        codigo,
        descripcion,
        nivel,
        activo,
        orden,
        editable,
        permisos: {},
      })
      .select(`
        id,
        nombre,
        codigo,
        descripcion,
        nivel,
        activo,
        orden,
        editable,
        created_at
      `)
      .single();

    if (error) {
      return jsonError(
        error.message,
        500
      );
    }

    return jsonOk({
      message:
        "Rol creado correctamente.",

      rol,
    });
  } catch (error: any) {
    console.error(
      "POST /api/roles-permisos:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   PUT
============================================================ */

/**
 * PUT /api/roles-permisos
 *
 * Actualiza información del rol.
 *
 * Body:
 *
 * {
 *   id,
 *   nombre,
 *   codigo,
 *   descripcion,
 *   nivel,
 *   activo,
 *   orden,
 *   editable
 * }
 */
export async function PUT(
  request: NextRequest
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    let body: AnyRecord;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const id =
      texto(
        body.id
      );

    if (!id) {
      return jsonError(
        "El ID del rol es obligatorio.",
        400
      );
    }

    const nombre =
      texto(
        body.nombre
      );

    const codigo =
      texto(
        body.codigo
      ).toUpperCase();

    if (!nombre) {
      return jsonError(
        "El nombre del rol es obligatorio.",
        400
      );
    }

    if (!codigo) {
      return jsonError(
        "El código del rol es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    /* ----------------------------------------------------------
       EXISTENCIA
    ---------------------------------------------------------- */

    const {
      data: rolActual,
      error:
        rolActualError,
    } = await supabase
      .from("roles")
      .select(
        "id,editable"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (rolActualError) {
      return jsonError(
        rolActualError.message,
        500
      );
    }

    if (!rolActual) {
      return jsonError(
        "Rol no encontrado.",
        404
      );
    }

    if (
      rolActual.editable === false
    ) {
      return jsonError(
        "Este rol no puede ser editado.",
        403
      );
    }

    /* ----------------------------------------------------------
       DUPLICADOS
    ---------------------------------------------------------- */

    const {
      data: codigoDuplicado,
    } = await supabase
      .from("roles")
      .select("id")
      .eq(
        "codigo",
        codigo
      )
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (codigoDuplicado) {
      return jsonError(
        "Ya existe otro rol con ese código.",
        409
      );
    }

    const {
      data: nombreDuplicado,
    } = await supabase
      .from("roles")
      .select("id")
      .eq(
        "nombre",
        nombre
      )
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (nombreDuplicado) {
      return jsonError(
        "Ya existe otro rol con ese nombre.",
        409
      );
    }

    /* ----------------------------------------------------------
       ACTUALIZAR
    ---------------------------------------------------------- */

    const {
      data: rol,
      error,
    } = await supabase
      .from("roles")
      .update({
        nombre,
        codigo,
        descripcion:
          texto(
            body.descripcion
          ) || null,
        nivel:
          Number.isFinite(
            Number(body.nivel)
          )
            ? Number(body.nivel)
            : 1,
        activo:
          body.activo !== false,
        orden:
          Number.isFinite(
            Number(body.orden)
          )
            ? Number(body.orden)
            : 1,
        editable:
          body.editable !== false,
      })
      .eq(
        "id",
        id
      )
      .select(`
        id,
        nombre,
        codigo,
        descripcion,
        nivel,
        activo,
        orden,
        editable,
        created_at
      `)
      .single();

    if (error) {
      return jsonError(
        error.message,
        500
      );
    }

    return jsonOk({
      message:
        "Rol actualizado correctamente.",

      rol,
    });
  } catch (error: any) {
    console.error(
      "PUT /api/roles-permisos:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   PATCH
============================================================ */

/**
 * PATCH /api/roles-permisos
 *
 * Cambia únicamente el estado activo/inactivo.
 *
 * Body:
 *
 * {
 *   id,
 *   activo
 * }
 */
export async function PATCH(
  request: NextRequest
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    let body: AnyRecord;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const id =
      texto(
        body.id
      );

    if (!id) {
      return jsonError(
        "El ID del rol es obligatorio.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    const {
      data: rolActual,
      error:
        rolActualError,
    } = await supabase
      .from("roles")
      .select(
        "id,activo,editable"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (rolActualError) {
      return jsonError(
        rolActualError.message,
        500
      );
    }

    if (!rolActual) {
      return jsonError(
        "Rol no encontrado.",
        404
      );
    }

    if (
      rolActual.editable === false
    ) {
      return jsonError(
        "Este rol no puede ser modificado.",
        403
      );
    }

    const nuevoEstado =
      typeof body.activo ===
      "boolean"
        ? body.activo
        : !rolActual.activo;

    const {
      error,
    } = await supabase
      .from("roles")
      .update({
        activo:
          nuevoEstado,
      })
      .eq(
        "id",
        id
      );

    if (error) {
      return jsonError(
        error.message,
        500
      );
    }

    return jsonOk({
      message:
        nuevoEstado
          ? "Rol activado correctamente."
          : "Rol desactivado correctamente.",

      activo:
        nuevoEstado,
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/roles-permisos:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}

/* ============================================================
   DELETE
============================================================ */

/**
 * DELETE /api/roles-permisos
 *
 * Sincroniza los permisos de un rol.
 *
 * Body:
 *
 * {
 *   rol_id,
 *   permiso_ids: []
 * }
 */
export async function DELETE(
  request: NextRequest
) {
  try {
    const actor =
      await getProfileFromBearer(
        request
      );

    if (!actor) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    let body: AnyRecord;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const rolId =
      texto(
        body.rol_id
      );

    if (!rolId) {
      return jsonError(
        "El rol es obligatorio.",
        400
      );
    }

    const permisoIds =
      Array.isArray(
        body.permiso_ids
      )
        ? Array.from(
            new Set(
              body.permiso_ids
                .map(
                  (id: unknown) =>
                    texto(id)
                )
                .filter(Boolean)
            )
          )
        : [];

    const supabase =
      supabaseAdmin();

    /* ----------------------------------------------------------
       VALIDAR ROL
    ---------------------------------------------------------- */

    const {
      data: rol,
      error: rolError,
    } = await supabase
      .from("roles")
      .select(
        "id,editable"
      )
      .eq(
        "id",
        rolId
      )
      .maybeSingle();

    if (rolError) {
      return jsonError(
        rolError.message,
        500
      );
    }

    if (!rol) {
      return jsonError(
        "Rol no encontrado.",
        404
      );
    }

    if (
      rol.editable === false
    ) {
      return jsonError(
        "Este rol no permite modificar sus permisos.",
        403
      );
    }

    /* ----------------------------------------------------------
       VALIDAR PERMISOS
    ---------------------------------------------------------- */

    if (
      permisoIds.length >
      0
    ) {
      const {
        data: permisosValidos,
        error:
          permisosError,
      } = await supabase
        .from("permisos")
        .select("id")
        .in(
          "id",
          permisoIds
        )
        .eq(
          "activo",
          true
        );

      if (permisosError) {
        return jsonError(
          permisosError.message,
          500
        );
      }

      const validos =
        new Set(
          (
            permisosValidos ||
            []
          ).map(
            (p) =>
              p.id
          )
        );

      const invalidos =
        permisoIds.filter(
          (id) =>
            !validos.has(id)
        );

      if (
        invalidos.length >
        0
      ) {
        return jsonError(
          "Uno o más permisos seleccionados no existen o están inactivos.",
          400
        );
      }
    }

    /* ----------------------------------------------------------
       ELIMINAR RELACIONES ACTUALES
    ---------------------------------------------------------- */

    const {
      error:
        deleteError,
    } = await supabase
      .from(
        "roles_permisos"
      )
      .delete()
      .eq(
        "rol_id",
        rolId
      );

    if (deleteError) {
      return jsonError(
        deleteError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       CREAR NUEVAS RELACIONES
    ---------------------------------------------------------- */

    if (
      permisoIds.length >
      0
    ) {
      const relaciones =
        permisoIds.map(
          (
            permisoId
          ) => ({
            rol_id:
              rolId,

            permiso_id:
              permisoId,
          })
        );

      const {
        error:
          insertError,
      } = await supabase
        .from(
          "roles_permisos"
        )
        .insert(
          relaciones
        );

      if (insertError) {
        return jsonError(
          insertError.message,
          500
        );
      }
    }

    return jsonOk({
      message:
        "Permisos del rol actualizados correctamente.",

      rol_id:
        rolId,

      cantidad:
        permisoIds.length,
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/roles-permisos:",
      error
    );

    return jsonError(
      errorMessage(error),
      500
    );
  }
}