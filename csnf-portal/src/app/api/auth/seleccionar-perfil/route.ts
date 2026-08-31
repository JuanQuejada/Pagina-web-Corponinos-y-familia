import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function respuesta(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, { status });
}

function obtenerToken(
  request: NextRequest
): string | null {
  const authorization =
    request.headers.get("authorization") || "";

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

/**
 * POST /api/auth/seleccionar-perfil
 *
 * Body:
 * {
 *   asignacion_id: string
 * }
 *
 * La asignación es la unidad real del perfil activo.
 *
 * Una persona puede tener múltiples asignaciones activas
 * en usuarios_asignaciones.
 */
export async function POST(
  request: NextRequest
) {
  try {
    // ==========================================================
    // 1. TOKEN DE AUTENTICACIÓN
    // ==========================================================

    const token = obtenerToken(request);

    if (!token) {
      return respuesta(
        {
          success: false,
          error:
            "No se proporcionó token de autenticación.",
        },
        401
      );
    }

    // ==========================================================
    // 2. VALIDAR SESIÓN SUPABASE
    // ==========================================================

    const {
      data: { user },
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return respuesta(
        {
          success: false,
          error:
            "Sesión inválida o expirada.",
        },
        401
      );
    }

    // ==========================================================
    // 3. LEER ASIGNACIÓN SOLICITADA
    // ==========================================================

    const body =
      await request.json().catch(() => ({}));

    const asignacionId =
      String(
        body?.asignacion_id || ""
      ).trim();

    if (!asignacionId) {
      return respuesta(
        {
          success: false,
          error:
            "El ID de la asignación es obligatorio.",
        },
        400
      );
    }

    // ==========================================================
    // 4. OBTENER USUARIO DEL PORTAL
    // ==========================================================

    const {
      data: usuario,
      error: usuarioError,
    } =
      await supabaseAdmin
        .from("usuarios")
        .select(
          "id,auth_user_id,estado_usuario_id"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (usuarioError) {
      console.error(
        "Error obteniendo usuario del portal:",
        usuarioError
      );

      return respuesta(
        {
          success: false,
          error:
            "No fue posible obtener el usuario del portal.",
          detalle: usuarioError.message,
        },
        500
      );
    }

    if (!usuario) {
      return respuesta(
        {
          success: false,
          error:
            "No existe un usuario de portal asociado a la sesión.",
        },
        404
      );
    }

    // ==========================================================
    // 5. OBTENER LA ASIGNACIÓN
    // ==========================================================
    //
    // IMPORTANTE PARA MULTICARGO:
    //
    // NO utilizamos usuarios.cargo_id para determinar el cargo
    // seleccionado.
    //
    // La relación correcta es:
    //
    // usuarios
    //    ↓
    // usuarios_asignaciones
    //    ↓
    // cargo + rol
    //
    // De esta manera un mismo usuario puede seleccionar entre
    // varias combinaciones cargo/rol.
    // ==========================================================

    const {
      data: asignacion,
      error: asignacionError,
    } =
      await supabaseAdmin
        .from("usuarios_asignaciones")
        .select(`
          id,
          usuario_id,
          cargo_id,
          rol_id,
          activo,
          perfil_predeterminado,
          cargo:cargos(
            id,
            codigo,
            nombre,
            activo
          ),
          rol:roles(
            id,
            codigo,
            nombre,
            nivel,
            activo
          )
        `)
        .eq("id", asignacionId)
        .eq("usuario_id", usuario.id)
        .eq("activo", true)
        .maybeSingle();

    if (asignacionError) {
      console.error(
        "Error validando asignación:",
        asignacionError
      );

      return respuesta(
        {
          success: false,
          error:
            "No fue posible validar la asignación seleccionada.",
          detalle: asignacionError.message,
        },
        500
      );
    }

    if (!asignacion) {
      return respuesta(
        {
          success: false,
          error:
            "La asignación seleccionada no pertenece al usuario o está inactiva.",
        },
        403
      );
    }

    // ==========================================================
    // 6. NORMALIZAR RELACIONES SUPABASE
    // ==========================================================
    //
    // Supabase puede generar el tipo de una relación como:
    //
    //   objeto
    //
    // o:
    //
    //   objeto[]
    //
    // Aunque conceptualmente cada asignación tenga un solo
    // cargo y un solo rol.
    //
    // Normalizamos ambas posibilidades.
    // ==========================================================

    const cargo =
      Array.isArray(asignacion.cargo)
        ? asignacion.cargo[0] ?? null
        : asignacion.cargo ?? null;

    const rol =
      Array.isArray(asignacion.rol)
        ? asignacion.rol[0] ?? null
        : asignacion.rol ?? null;

    // ==========================================================
    // 7. VALIDAR CARGO
    // ==========================================================

    if (!cargo) {
      return respuesta(
        {
          success: false,
          error:
            "La asignación seleccionada no tiene un cargo asociado.",
        },
        409
      );
    }

    if (cargo.activo === false) {
      return respuesta(
        {
          success: false,
          error:
            "El cargo seleccionado está inactivo.",
        },
        409
      );
    }

    // ==========================================================
    // 8. VALIDAR ROL
    // ==========================================================

    if (!rol) {
      return respuesta(
        {
          success: false,
          error:
            "La asignación seleccionada no tiene un rol asociado.",
        },
        409
      );
    }

    if (rol.activo === false) {
      return respuesta(
        {
          success: false,
          error:
            "El rol seleccionado está inactivo.",
        },
        409
      );
    }

    // ==========================================================
    // 9. CREAR RESPUESTA
    // ==========================================================

    const response =
      respuesta({
        success: true,

        usuario_id:
          usuario.id,

        asignacion: {
          id:
            asignacion.id,

          usuario_id:
            asignacion.usuario_id,

          cargo_id:
            asignacion.cargo_id,

          rol_id:
            asignacion.rol_id,

          activo:
            asignacion.activo,

          perfil_predeterminado:
            asignacion.perfil_predeterminado,

          cargo,

          rol,
        },
      });

    // ==========================================================
    // 10. GUARDAR ASIGNACIÓN ACTIVA EN COOKIE
    // ==========================================================
    //
    // La cookie permite que el servidor conozca qué asignación
    // eligió el usuario durante la sesión.
    //
    // IMPORTANTE:
    // La cookie NO se considera fuente de confianza por sí sola.
    // Cada endpoint sensible debe validar que la asignación:
    //
    // - pertenece al usuario autenticado
    // - está activa
    //
    // ==========================================================

    response.cookies.set(
      "csnf_asignacion_activa",
      asignacion.id,
      {
        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        path: "/",

        maxAge:
          60 * 60 * 12,
      }
    );

    return response;

  } catch (error: any) {

    console.error(
      "POST /api/auth/seleccionar-perfil:",
      error
    );

    return respuesta(
      {
        success: false,

        error:
          error?.message ||
          "Error interno del servidor.",
      },
      500
    );
  }
}

// ============================================================
// DELETE /api/auth/seleccionar-perfil
//
// Elimina la asignación activa de la sesión.
// ============================================================

export async function DELETE(
  _request: NextRequest
) {
  const response =
    respuesta({
      success: true,
    });

  response.cookies.set(
    "csnf_asignacion_activa",
    "",
    {
      httpOnly: true,

      sameSite: "lax",

      secure:
        process.env.NODE_ENV ===
        "production",

      path: "/",

      maxAge: 0,
    }
  );

  return response;
}