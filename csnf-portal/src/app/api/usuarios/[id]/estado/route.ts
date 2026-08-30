import { NextRequest } from "next/server";

import {
  supabaseAdmin,
  getProfileFromBearer,
  jsonOk,
  jsonError,
} from "@/lib/document-domain";

/* ============================================================
   HELPERS
============================================================ */

function texto(value: unknown): string {
  return String(value ?? "").trim();
}

function esUuid(
  value: unknown
): boolean {
  const id = texto(value);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

/* ============================================================
   PATCH /api/usuarios/[id]/estado
============================================================ */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const { id } =
      await context.params;

    if (!esUuid(id)) {
      return jsonError(
        "El identificador del usuario no es válido.",
        400
      );
    }

    let body: Record<
      string,
      any
    >;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400
      );
    }

    const supabase =
      supabaseAdmin();

    /* ----------------------------------------------------------
       USUARIO
    ---------------------------------------------------------- */

    const {
      data: usuario,
      error: usuarioError,
    } = await supabase
      .from("usuarios")
      .select(`
        id,
        estado_usuario_id,
        auth_user_id,

        estado_usuario:estados_usuario(
          id,
          codigo,
          nombre,
          activo
        )
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (usuarioError) {
      return jsonError(
        usuarioError.message,
        500
      );
    }

    if (!usuario) {
      return jsonError(
        "Usuario no encontrado.",
        404
      );
    }

    /* ----------------------------------------------------------
       ESTADO SOLICITADO
    ---------------------------------------------------------- */

    let nuevoEstadoId =
      texto(
        body.estado_usuario_id
      );

    /*
     * También permitimos:
     *
     * { activo: true }
     * { activo: false }
     */

    if (!nuevoEstadoId) {
      if (
        typeof body.activo !==
        "boolean"
      ) {
        return jsonError(
          "Debe indicar estado_usuario_id o activo.",
          400
        );
      }

      const estadoActual =
        usuario.estado_usuario as any;

      const codigoActual =
        texto(
          estadoActual?.codigo
        ).toUpperCase();

      const nombreActual =
        texto(
          estadoActual?.nombre
        ).toLowerCase();

      const esActivo =
        codigoActual === "ACT" ||
        nombreActual === "activo";

      const nuevoActivo =
        body.activo;

      if (
        nuevoActivo ===
        esActivo
      ) {
        return jsonOk({
          message:
            "El usuario ya se encuentra en el estado solicitado.",
        });
      }

      const {
        data: estados,
        error: estadosError,
      } = await supabase
        .from(
          "estados_usuario"
        )
        .select(
          "id,codigo,nombre,activo"
        )
        .eq(
          "activo",
          true
        );

      if (estadosError) {
        return jsonError(
          estadosError.message,
          500
        );
      }

      const estadoEncontrado =
        (estados || []).find(
          (estado) => {
            const codigo =
              texto(
                estado.codigo
              ).toUpperCase();

            const nombre =
              texto(
                estado.nombre
              ).toLowerCase();

            if (nuevoActivo) {
              return (
                codigo === "ACT" ||
                nombre === "activo"
              );
            }

            return (
              codigo === "INA" ||
              nombre === "inactivo"
            );
          }
        );

      if (!estadoEncontrado) {
        return jsonError(
          nuevoActivo
            ? "No se encontró el estado activo."
            : "No se encontró el estado inactivo.",
          400
        );
      }

      nuevoEstadoId =
        estadoEncontrado.id;
    }

    /* ----------------------------------------------------------
       VALIDAR ESTADO
    ---------------------------------------------------------- */

    const {
      data: nuevoEstado,
      error: nuevoEstadoError,
    } = await supabase
      .from(
        "estados_usuario"
      )
      .select(
        "id,codigo,nombre,activo"
      )
      .eq(
        "id",
        nuevoEstadoId
      )
      .maybeSingle();

    if (nuevoEstadoError) {
      return jsonError(
        nuevoEstadoError.message,
        500
      );
    }

    if (!nuevoEstado) {
      return jsonError(
        "El estado seleccionado no existe.",
        400
      );
    }

    if (!nuevoEstado.activo) {
      return jsonError(
        "No se puede asignar un estado maestro inactivo.",
        400
      );
    }

    /* ----------------------------------------------------------
       ACTUALIZAR
    ---------------------------------------------------------- */

    const {
      data: actualizado,
      error: updateError,
    } = await supabase
      .from("usuarios")
      .update({
        estado_usuario_id:
          nuevoEstado.id,

        updated_by:
          actor.profile.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        id
      )
      .select(`
        id,
        estado_usuario_id,

        estado_usuario:estados_usuario(
          id,
          codigo,
          nombre
        )
      `)
      .single();

    if (updateError) {
      return jsonError(
        updateError.message,
        500
      );
    }

    /* ----------------------------------------------------------
       DETERMINAR SI QUEDÓ ACTIVO
    ---------------------------------------------------------- */

    const codigoNuevo =
      texto(
        nuevoEstado.codigo
      ).toUpperCase();

    const nombreNuevo =
      texto(
        nuevoEstado.nombre
      ).toLowerCase();

    const estaActivo =
      codigoNuevo === "ACT" ||
      nombreNuevo === "activo";

    /* ----------------------------------------------------------
       DESACTIVAR ASIGNACIONES
    ---------------------------------------------------------- */

    if (!estaActivo) {
      const {
        error:
          asignacionesError,
      } = await supabase
        .from(
          "usuarios_asignaciones"
        )
        .update({
          activo: false,
        })
        .eq(
          "usuario_id",
          id
        );

      if (asignacionesError) {
        console.error(
          "Error desactivando asignaciones:",
          asignacionesError
        );

        return jsonError(
          `El usuario cambió de estado, pero no fue posible desactivar sus asignaciones: ${asignacionesError.message}`,
          500
        );
      }
    }

    return jsonOk({
      message:
        estaActivo
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente.",

      usuario:
        actualizado,
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/usuarios/[id]/estado:",
      error
    );

    return jsonError(
      error?.message ||
        "No fue posible cambiar el estado.",
      500
    );
  }
}