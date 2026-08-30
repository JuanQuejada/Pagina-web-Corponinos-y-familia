// ============================================================
// API - SELECCIONAR PERFIL
// Portal Corporación Social Niños y Familia
// ============================================================

import { NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  validarAsignacionUsuario,
  COOKIE_PERFIL_ACTIVO,
} from "@/lib/auth/server-context";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database";

// ============================================================
// SUPABASE ADMIN
// ============================================================

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// TOKEN
// ============================================================

function obtenerToken(request: NextRequest) {

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

// ============================================================
// POST
// ============================================================

export async function POST(
  request: NextRequest
) {

  try {

    // --------------------------------------------------------
    // 1. Validar token
    // --------------------------------------------------------

    const token = obtenerToken(request);

    if (!token) {
      return Response.json(
        {
          success: false,
          error:
            "No se recibió el token de autenticación.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------------
    // 2. Validar sesión Auth
    // --------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return Response.json(
        {
          success: false,
          error:
            "La sesión no es válida o ha expirado.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------------
    // 3. Leer body
    // --------------------------------------------------------

    const body = await request.json().catch(
      () => null
    );

    const asignacionId =
      typeof body?.asignacion_id === "string"
        ? body.asignacion_id.trim()
        : "";

    if (!asignacionId) {
      return Response.json(
        {
          success: false,
          error:
            "Debe indicar el perfil que desea seleccionar.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // 4. Obtener usuario portal
    // --------------------------------------------------------

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        auth_user_id,
        nombres,
        apellidos,
        razon_social,
        email
      `)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError) {
      return Response.json(
        {
          success: false,
          error:
            "No fue posible obtener el usuario del portal.",
        },
        {
          status: 500,
        }
      );
    }

    if (!usuario) {
      return Response.json(
        {
          success: false,
          error:
            "No existe un usuario asociado a esta cuenta.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // 5. VALIDACIÓN DE SEGURIDAD
    // --------------------------------------------------------
    //
    // MUY IMPORTANTE:
    //
    // Nunca confiamos en que el frontend nos diga:
    //
    // usuario_id
    // cargo_id
    // rol_id
    //
    // Solamente recibimos asignacion_id.
    //
    // Luego verificamos en BD que esa asignación:
    //
    //  - exista
    //  - pertenezca al usuario autenticado
    //  - esté activa
    //
    // --------------------------------------------------------

    const asignacion =
      await validarAsignacionUsuario(
        usuario.id,
        asignacionId
      );

    if (!asignacion) {
      return Response.json(
        {
          success: false,
          error:
            "El perfil seleccionado no pertenece al usuario autenticado o ya no está activo.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------------
    // 6. Guardar perfil en cookie HttpOnly
    // --------------------------------------------------------

    const cookieStore = await cookies();

    cookieStore.set(
      COOKIE_PERFIL_ACTIVO,
      asignacion.id,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          60 * 60 * 8,
      }
    );

    // --------------------------------------------------------
    // 7. Respuesta
    // --------------------------------------------------------

    return Response.json({
      success: true,

      message:
        "Perfil seleccionado correctamente.",

      perfil: {
        id: asignacion.id,

        cargo: asignacion.cargo
          ? {
              id: asignacion.cargo.id,
              nombre:
                asignacion.cargo.nombre,
              codigo:
                asignacion.cargo.codigo,
            }
          : null,

        rol: asignacion.rol
          ? {
              id: asignacion.rol.id,
              nombre:
                asignacion.rol.nombre,
              codigo:
                asignacion.rol.codigo,
              nivel:
                asignacion.rol.nivel,
            }
          : null,
      },
    });

  } catch (error: any) {

    console.error(
      "Error API selección de perfil:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error?.message ??
          "No fue posible seleccionar el perfil.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE
// ============================================================

export async function DELETE() {

  try {

    const cookieStore = await cookies();

    cookieStore.delete(
      COOKIE_PERFIL_ACTIVO
    );

    return Response.json({
      success: true,
      message:
        "Perfil activo eliminado.",
    });

  } catch (error: any) {

    console.error(
      "Error eliminando perfil activo:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "No fue posible eliminar el perfil activo.",
      },
      {
        status: 500,
      }
    );
  }
}