// ============================================================
// SERVER AUTH CONTEXT
// Portal Corporación Social Niños y Familia
// Seguridad centralizada de usuario + perfil activo
// ============================================================

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database";

import { cookies } from "next/headers";

// ============================================================
// VARIABLES DE ENTORNO
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
  );
}

// ============================================================
// SUPABASE ADMIN
// ============================================================

function crearSupabaseAdmin() {
  return createClient<Database>(
    SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ============================================================
// COOKIE DEL PERFIL ACTIVO
// ============================================================

export const COOKIE_PERFIL_ACTIVO = "portal_perfil_id";

// ============================================================
// TIPOS
// ============================================================

export interface ContextoPerfil {
  authUser: {
    id: string;
    email?: string | null;
  };

  usuario: {
    id: string;
    auth_user_id: string | null;
    nombres: string | null;
    apellidos: string | null;
    razon_social: string | null;
    email: string | null;
    estado_usuario_id: string | null;
  };

  asignacion: {
    id: string;
    usuario_id: string;
    cargo_id: string;
    rol_id: string;
    activo: boolean;
    perfil_predeterminado: boolean | null;
  };

  cargo: {
    id: string;
    nombre: string;
    codigo?: string | null;
    departamento_id?: string | null;
  } | null;

  rol: {
    id: string;
    nombre: string;
    codigo?: string | null;
    nivel: number;
    permisos: Record<string, string[]> | null;
    activo?: boolean | null;
  } | null;
}

// ============================================================
// EXTRAER BEARER TOKEN
// ============================================================

function obtenerBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  return token || null;
}

// ============================================================
// OBTENER USUARIO AUTENTICADO
// ============================================================

async function obtenerAuthUser(request: NextRequest) {
  const token = obtenerBearerToken(request);

  if (!token) {
    return {
      user: null,
      error: "No se recibió el token de autenticación.",
    };
  }

  const supabaseAdmin = crearSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: "La sesión no es válida o ha expirado.",
    };
  }

  return {
    user,
    error: null,
  };
}

// ============================================================
// OBTENER USUARIO DEL PORTAL
// ============================================================

async function obtenerUsuarioPortal(
  authUserId: string
) {
  const supabaseAdmin = crearSupabaseAdmin();

  const { data, error } = await supabaseAdmin
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
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No fue posible obtener el usuario del portal: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "No existe un usuario del portal asociado a la cuenta autenticada."
    );
  }

  return data;
}

// ============================================================
// OBTENER ASIGNACIONES ACTIVAS
// ============================================================

export async function obtenerAsignacionesActivas(
  usuarioId: string
) {
  const supabaseAdmin = crearSupabaseAdmin();

  const { data, error } = await supabaseAdmin
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
        nombre,
        codigo,
        departamento_id
      ),

      rol:roles(
        id,
        nombre,
        codigo,
        nivel,
        permisos,
        activo
      )
    `)
    .eq("usuario_id", usuarioId)
    .eq("activo", true)
    .order("perfil_predeterminado", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `No fue posible obtener las asignaciones: ${error.message}`
    );
  }

  return data ?? [];
}

// ============================================================
// OBTENER PERFIL SELECCIONADO
// ============================================================

export async function obtenerPerfilActivoServidor(
  request: NextRequest
): Promise<ContextoPerfil | null> {

  // ----------------------------------------------------------
  // 1. Validar autenticación
  // ----------------------------------------------------------

  const authResult = await obtenerAuthUser(request);

  if (!authResult.user) {
    return null;
  }

  const authUser = authResult.user;

  // ----------------------------------------------------------
  // 2. Obtener usuario portal
  // ----------------------------------------------------------

  const usuario = await obtenerUsuarioPortal(authUser.id);

  // ----------------------------------------------------------
  // 3. Obtener asignaciones activas
  // ----------------------------------------------------------

  const asignaciones =
    await obtenerAsignacionesActivas(usuario.id);

  if (!asignaciones.length) {
    return null;
  }

  // ----------------------------------------------------------
  // 4. Obtener cookie seleccionada
  // ----------------------------------------------------------

  const cookieStore = await cookies();

  const perfilCookie =
    cookieStore.get(COOKIE_PERFIL_ACTIVO)?.value ?? null;

  // ----------------------------------------------------------
  // 5. Determinar asignación
  // ----------------------------------------------------------

  let asignacion: any = null;

  if (perfilCookie) {
    asignacion =
      asignaciones.find(
        (item: any) => item.id === perfilCookie
      ) ?? null;
  }

  // ----------------------------------------------------------
  // 6. Si no existe cookie
  // ----------------------------------------------------------

  if (!asignacion) {

    // Si solo tiene una asignación,
    // esa es automáticamente la activa.

    if (asignaciones.length === 1) {
      asignacion = asignaciones[0];
    }

    // Si tiene varias y no seleccionó ninguna,
    // NO debemos elegir arbitrariamente.

    else {
      return null;
    }
  }

  // ----------------------------------------------------------
  // 7. Seguridad adicional
  // ----------------------------------------------------------

  if (asignacion.usuario_id !== usuario.id) {
    return null;
  }

  if (asignacion.activo !== true) {
    return null;
  }

  // ----------------------------------------------------------
  // 8. Construir contexto
  // ----------------------------------------------------------

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
    },

    usuario,

    asignacion: {
      id: asignacion.id,
      usuario_id: asignacion.usuario_id,
      cargo_id: asignacion.cargo_id,
      rol_id: asignacion.rol_id,
      activo: asignacion.activo,
      perfil_predeterminado:
        asignacion.perfil_predeterminado,
    },

    cargo: asignacion.cargo ?? null,

    rol: asignacion.rol ?? null,
  };
}

// ============================================================
// VALIDAR PERFIL ESPECÍFICO
// ============================================================

export async function validarAsignacionUsuario(
  usuarioId: string,
  asignacionId: string
) {
  const supabaseAdmin = crearSupabaseAdmin();

  const { data, error } = await supabaseAdmin
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
        nombre,
        codigo,
        departamento_id
      ),

      rol:roles(
        id,
        nombre,
        codigo,
        nivel,
        permisos,
        activo
      )
    `)
    .eq("id", asignacionId)
    .eq("usuario_id", usuarioId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No fue posible validar el perfil: ${error.message}`
    );
  }

  return data;
}

// ============================================================
// VALIDAR ROL
// ============================================================

export function usuarioTieneNivel(
  contexto: ContextoPerfil | null,
  nivelMaximo: number
): boolean {

  if (!contexto?.rol) {
    return false;
  }

  return contexto.rol.nivel <= nivelMaximo;
}

// ============================================================
// VALIDAR PERMISO
// ============================================================

export function perfilTienePermiso(
  contexto: ContextoPerfil | null,
  recurso: string,
  accion: string
): boolean {

  if (!contexto?.rol) {
    return false;
  }

  // Super Administrador
  if (contexto.rol.nivel === 1) {
    return true;
  }

  const permisos =
    contexto.rol.permisos?.[recurso];

  if (!Array.isArray(permisos)) {
    return false;
  }

  return permisos.includes(accion);
}

// ============================================================
// RESPUESTAS
// ============================================================

export function respuestaNoAutenticado() {
  return Response.json(
    {
      success: false,
      error: "Sesión no válida o expirada.",
    },
    {
      status: 401,
    }
  );
}

export function respuestaSinPerfil() {
  return Response.json(
    {
      success: false,
      error: "No existe un perfil activo seleccionado.",
    },
    {
      status: 403,
    }
  );
}

export function respuestaSinPermiso() {
  return Response.json(
    {
      success: false,
      error: "No tienes permisos suficientes para realizar esta operación.",
    },
    {
      status: 403,
    }
  );
}