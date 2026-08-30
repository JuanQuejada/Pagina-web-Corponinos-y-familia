// ============================================================
// API - PERFILES DISPONIBLES
// Portal Corporación Social Niños y Familia
// ============================================================

import { NextRequest } from "next/server";

import {
  obtenerAsignacionesActivas,
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
// BEARER
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
// GET
// ============================================================

export async function GET(request: NextRequest) {

  try {

    // --------------------------------------------------------
    // 1. Validar token
    // --------------------------------------------------------

    const token = obtenerToken(request);

    if (!token) {
      return Response.json(
        {
          success: false,
          error: "No se recibió el token de autenticación.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 2. Validar usuario Auth
    // --------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return Response.json(
        {
          success: false,
          error: "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 3. Buscar usuario del portal
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
        email,
        estado_usuario_id
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
        { status: 500 }
      );
    }

    if (!usuario) {
      return Response.json(
        {
          success: false,
          error:
            "No existe un usuario asociado a esta cuenta.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // 4. Obtener asignaciones
    // --------------------------------------------------------

    const asignaciones =
      await obtenerAsignacionesActivas(usuario.id);

    // --------------------------------------------------------
    // 5. Formato seguro para frontend
    // --------------------------------------------------------

    const perfiles = asignaciones.map((asignacion: any) => ({
      id: asignacion.id,

      cargo: asignacion.cargo
        ? {
            id: asignacion.cargo.id,
            nombre: asignacion.cargo.nombre,
            codigo: asignacion.cargo.codigo,
          }
        : null,

      rol: asignacion.rol
        ? {
            id: asignacion.rol.id,
            nombre: asignacion.rol.nombre,
            codigo: asignacion.rol.codigo,
            nivel: asignacion.rol.nivel,
          }
        : null,

      departamento:
        asignacion.cargo?.departamento_id ?? null,

      perfil_predeterminado:
        asignacion.perfil_predeterminado === true,
    }));

    // --------------------------------------------------------
    // 6. Respuesta
    // --------------------------------------------------------

    return Response.json({
      success: true,

      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        razon_social: usuario.razon_social,
        email: usuario.email ?? user.email ?? null,
      },

      perfiles,

      cantidad: perfiles.length,

      requiereSeleccion:
        perfiles.length > 1,
    });

  } catch (error: any) {

    console.error(
      "Error API /api/auth/perfiles:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error?.message ??
          "No fue posible obtener los perfiles.",
      },
      { status: 500 }
    );
  }
}