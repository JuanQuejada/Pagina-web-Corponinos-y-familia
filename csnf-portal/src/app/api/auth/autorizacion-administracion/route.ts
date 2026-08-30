// ============================================================
// API AUTORIZACIÓN ADMINISTRACIÓN
// Portal Corporación Social Niños y Familia
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";

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
// TIPOS
// ============================================================

interface AutorizacionRequest {
  asignacion_id?: string;
}

interface Permiso {
  id: string;
  codigo: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
  activo: boolean;
  modulo_id: string;
}

interface PermisosRol {
  [modulo: string]: string[];
}

interface Asignacion {
  id: string;
  usuario_id: string;
  cargo_id: string;
  rol_id: string;
  activo: boolean;
  perfil_predeterminado: boolean | null;
  rol: {
    id: string;
    codigo: string | null;
    nombre: string | null;
    nivel: number;
    activo: boolean | null;
  } | null;
  cargo: {
    id: string;
    nombre: string | null;
    activo: boolean | null;
  } | null;
}

interface ResultadoAutorizacion {
  autorizado: boolean;
  usuario_id: string;
  asignacion_id: string;
  rol_id: string;
  cargo_id: string;
  rol_codigo: string | null;
  rol_nombre: string | null;
  rol_nivel: number;
  permisos: PermisosRol;
  permisos_codigos: string[];
}

// ============================================================
// NORMALIZAR PERMISOS
// ============================================================
//
// Convierte:
//
// [
//   { modulo: "Usuarios", codigo: "USR_VIEW" },
//   { modulo: "Usuarios", codigo: "USR_CREATE" }
// ]
//
// en:
//
// {
//   Usuarios: ["USR_VIEW", "USR_CREATE"]
// }
//
// También mantenemos permisos_codigos para poder comprobar
// rápidamente un permiso específico.
// ============================================================

function construirPermisosRol(
  permisos: Permiso[]
): {
  permisos: PermisosRol;
  permisos_codigos: string[];
} {
  const permisosNormalizados: PermisosRol = {};
  const permisosCodigos: string[] = [];

  for (const permiso of permisos) {
    if (!permiso || permiso.activo !== true) {
      continue;
    }

    const modulo =
      typeof permiso.modulo === "string"
        ? permiso.modulo.trim()
        : "";

    const codigo =
      typeof permiso.codigo === "string"
        ? permiso.codigo.trim()
        : "";

    if (!modulo || !codigo) {
      continue;
    }

    if (!permisosNormalizados[modulo]) {
      permisosNormalizados[modulo] = [];
    }

    if (!permisosNormalizados[modulo].includes(codigo)) {
      permisosNormalizados[modulo].push(codigo);
    }

    if (!permisosCodigos.includes(codigo)) {
      permisosCodigos.push(codigo);
    }
  }

  return {
    permisos: permisosNormalizados,
    permisos_codigos: permisosCodigos,
  };
}

// ============================================================
// VALIDAR TOKEN
// ============================================================

async function obtenerUsuarioAuth(token: string) {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// ============================================================
// POST
// ============================================================

export async function POST(request: Request) {
  try {
    // ========================================================
    // 1. OBTENER TOKEN
    // ========================================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          error:
            "No se proporcionó token de autenticación.",
        },
        { status: 401 }
      );
    }

    const partes = authorization
      .trim()
      .split(/\s+/);

    if (
      partes.length !== 2 ||
      partes[0].toLowerCase() !== "bearer" ||
      !partes[1]
    ) {
      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          error:
            "Formato de autorización inválido.",
        },
        { status: 401 }
      );
    }

    const token = partes[1];

    // ========================================================
    // 2. VALIDAR SESIÓN SUPABASE AUTH
    // ========================================================

    const authUser =
      await obtenerUsuarioAuth(token);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          error:
            "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const usuarioAuthId = authUser.id;

    // ========================================================
    // 3. LEER BODY
    // ========================================================

    let body: AutorizacionRequest = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const asignacionId =
      typeof body.asignacion_id === "string"
        ? body.asignacion_id.trim()
        : "";

    // ========================================================
    // 4. BUSCAR USUARIO DEL PORTAL
    // ========================================================
    //
    // Supabase Auth:
    //
    // auth.users.id
    //
    // se relaciona con:
    //
    // usuarios.auth_user_id
    //
    // ========================================================

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        auth_user_id,
        estado_usuario_id
      `)
      .eq("auth_user_id", usuarioAuthId)
      .maybeSingle();

    if (usuarioError) {
      console.error(
        "Error obteniendo usuario portal:",
        usuarioError
      );

      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          error:
            "No fue posible validar el usuario del portal.",
        },
        { status: 500 }
      );
    }

    if (!usuario) {
      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          motivo: "USUARIO_NO_REGISTRADO",
          error:
            "El usuario autenticado no está registrado en el portal.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 5. OBTENER ASIGNACIONES ACTIVAS
    // ========================================================
    //
    // Un usuario puede tener:
    //
    // Usuario
    //   ├── Cargo A + Rol A
    //   ├── Cargo B + Rol B
    //   └── Cargo C + Rol C
    //
    // Cada combinación constituye un perfil.
    //
    // IMPORTANTE:
    // La autorización se realizará sobre la asignación
    // seleccionada.
    // ========================================================

    const {
      data: asignaciones,
      error: asignacionesError,
    } = await supabaseAdmin
      .from("usuarios_asignaciones")
      .select(`
        id,
        usuario_id,
        cargo_id,
        rol_id,
        activo,
        perfil_predeterminado,

        rol:roles(
          id,
          codigo,
          nombre,
          nivel,
          activo
        ),

        cargo:cargos(
          id,
          nombre,
          activo
        )
      `)
      .eq("usuario_id", usuario.id)
      .eq("activo", true);

    if (asignacionesError) {
      console.error(
        "Error obteniendo asignaciones:",
        asignacionesError
      );

      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          error:
            "No fue posible validar las asignaciones del usuario.",
        },
        { status: 500 }
      );
    }

    const asignacionesActivas =
      (asignaciones ?? []) as unknown as Asignacion[];

    // ========================================================
    // 6. SIN ASIGNACIONES
    // ========================================================

    if (asignacionesActivas.length === 0) {
      return NextResponse.json(
        {
          success: true,
          autorizado: false,
          motivo: "SIN_ASIGNACION",
          requiere_seleccion_perfil: false,
          total_asignaciones: 0,
          error:
            "El usuario no tiene ninguna asignación activa.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 7. DETERMINAR ASIGNACIÓN
    // ========================================================

    let asignacionActiva: Asignacion | null =
      null;

    // --------------------------------------------------------
    // Si viene asignacion_id
    // --------------------------------------------------------

    if (asignacionId) {
      asignacionActiva =
        asignacionesActivas.find(
          (asignacion) =>
            asignacion.id === asignacionId
        ) ?? null;

      // ------------------------------------------------------
      // La asignación enviada NO pertenece al usuario
      // ------------------------------------------------------

      if (!asignacionActiva) {
        return NextResponse.json(
          {
            success: false,
            autorizado: false,
            motivo:
              "ASIGNACION_NO_PERTENECE_USUARIO",
            error:
              "La asignación seleccionada no pertenece al usuario autenticado.",
          },
          { status: 403 }
        );
      }
    }

    // ========================================================
    // 8. NO VIENE ASIGNACIÓN
    // ========================================================

    if (!asignacionActiva) {
      // ------------------------------------------------------
      // Un único perfil:
      // acceso directo
      // ------------------------------------------------------

      if (asignacionesActivas.length === 1) {
        asignacionActiva =
          asignacionesActivas[0];
      }

      // ------------------------------------------------------
      // Múltiples perfiles:
      // obligar selección
      // ------------------------------------------------------

      else {
        return NextResponse.json(
          {
            success: true,
            autorizado: false,
            motivo:
              "SELECCION_PERFIL_REQUERIDA",

            requiere_seleccion_perfil: true,

            total_asignaciones:
              asignacionesActivas.length,

            asignaciones:
              asignacionesActivas.map(
                (asignacion) => ({
                  id: asignacion.id,

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

                  cargo:
                    asignacion.cargo,

                  rol:
                    asignacion.rol,
                })
              ),

            error:
              "El usuario tiene múltiples perfiles activos y debe seleccionar uno.",
          },
          { status: 403 }
        );
      }
    }

    // ========================================================
    // 9. SEGURIDAD
    // ========================================================

    if (!asignacionActiva) {
      return NextResponse.json(
        {
          success: false,
          autorizado: false,
          motivo: "ASIGNACION_INVALIDA",
          error:
            "No fue posible determinar una asignación válida.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 10. OBTENER ROL
    // ========================================================

    const rol =
      asignacionActiva.rol;

    const cargo =
      asignacionActiva.cargo;

    // ========================================================
    // 11. VALIDAR ROL
    // ========================================================

    if (!rol) {
      return NextResponse.json(
        {
          success: true,
          autorizado: false,
          motivo: "SIN_ROL",
          perfil: {
            asignacion_id:
              asignacionActiva.id,
            cargo_id:
              asignacionActiva.cargo_id,
          },
          error:
            "La asignación seleccionada no tiene un rol asociado.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 12. ROL ACTIVO
    // ========================================================

    if (rol.activo === false) {
      return NextResponse.json(
        {
          success: true,
          autorizado: false,
          motivo: "ROL_INACTIVO",

          perfil: {
            asignacion_id:
              asignacionActiva.id,

            cargo_id:
              asignacionActiva.cargo_id,

            cargo_nombre:
              cargo?.nombre ?? null,

            rol_id:
              rol.id,

            rol_codigo:
              rol.codigo,

            rol_nombre:
              rol.nombre,

            rol_nivel:
              rol.nivel,
          },

          error:
            "El rol asociado al perfil seleccionado está inactivo.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 13. CARGO ACTIVO
    // ========================================================

    if (cargo && cargo.activo === false) {
      return NextResponse.json(
        {
          success: true,
          autorizado: false,
          motivo: "CARGO_INACTIVO",

          perfil: {
            asignacion_id:
              asignacionActiva.id,

            cargo_id:
              asignacionActiva.cargo_id,

            cargo_nombre:
              cargo.nombre,

            rol_id:
              rol.id,

            rol_codigo:
              rol.codigo,

            rol_nombre:
              rol.nombre,

            rol_nivel:
              rol.nivel,
          },

          error:
            "El cargo asociado al perfil seleccionado está inactivo.",
        },
        { status: 403 }
      );
    }

    // ========================================================
// 14. OBTENER PERMISOS DESDE roles_permisos
// ========================================================
//
// IMPORTANTE:
//
// Supabase puede perder la inferencia de tipos cuando la
// relación entre roles_permisos y permisos no está definida
// correctamente en Database.
//
// Para evitar que TypeScript convierta el resultado en:
//
// SelectQueryError
//
// obtenemos primero los permiso_id asociados al rol y luego
// consultamos directamente la tabla permisos.
//
// Esto además evita depender de la inferencia de relaciones
// de Supabase.
//
// ========================================================

const {
  data: relacionesPermisos,
  error: relacionesPermisosError,
} = await supabaseAdmin
  .from("roles_permisos")
  .select("permiso_id")
  .eq("rol_id", rol.id);

if (relacionesPermisosError) {
  console.error(
    "Error obteniendo relaciones de permisos del rol:",
    relacionesPermisosError
  );

  return NextResponse.json(
    {
      success: false,
      autorizado: false,
      motivo: "ERROR_OBTENIENDO_PERMISOS",
      error:
        "No fue posible obtener los permisos asociados al rol.",
    },
    { status: 500 }
  );
}

// ========================================================
// 14.1 IDS DE PERMISOS
// ========================================================

const permisoIds = (relacionesPermisos ?? [])
  .map((item) => item.permiso_id)
  .filter(
    (id): id is string =>
      typeof id === "string" && id.trim().length > 0
  );

// ========================================================
// 14.2 OBTENER PERMISOS
// ========================================================

let permisosValidos: Permiso[] = [];

if (permisoIds.length > 0) {
  const {
    data: permisosData,
    error: permisosError,
  } = await supabaseAdmin
    .from("permisos")
    .select(`
      id,
      codigo,
      modulo,
      accion,
      descripcion,
      activo,
      modulo_id
    `)
    .in("id", permisoIds);

  if (permisosError) {
    console.error(
      "Error obteniendo permisos:",
      permisosError
    );

    return NextResponse.json(
      {
        success: false,
        autorizado: false,
        motivo:
          "ERROR_OBTENIENDO_PERMISOS",
        error:
          "No fue posible obtener los permisos asociados al rol.",
      },
      { status: 500 }
    );
  }

  permisosValidos =
    (permisosData ?? []) as Permiso[];
}

// ========================================================
// 14.3 NORMALIZAR PERMISOS
// ========================================================

const {
  permisos,
  permisos_codigos,
} =
  construirPermisosRol(
    permisosValidos
  );

// ========================================================
// 15. CONTINUAR CON LA AUTORIZACIÓN
// ========================================================
    // ========================================================
    // 16. VALIDAR ACCESO A ADMINISTRACIÓN
    // ========================================================
    //
    // Regla actual:
    //
    // SUA -> nivel 1
    // ADP -> nivel 2
    //
    // Ambos tienen acceso a Administración.
    //
    // USI -> nivel 3
    // USE -> nivel 4
    //
    // No tienen acceso a Administración.
    //
    // ========================================================

    const esSuperAdmin =
      rol.nivel === 1;

    const esAdmin =
      rol.nivel <= 2;

    // ========================================================
    // 17. SIN ACCESO ADMINISTRATIVO
    // ========================================================

    if (!esAdmin) {
      return NextResponse.json(
        {
          success: true,
          autorizado: false,

          motivo:
            "ROL_SIN_ACCESO_ADMINISTRACION",

          es_admin: false,

          es_super_admin:
            esSuperAdmin,

          usuario_id:
            usuario.id,

          perfil: {
            asignacion_id:
              asignacionActiva.id,

            cargo_id:
              asignacionActiva.cargo_id,

            cargo_nombre:
              cargo?.nombre ?? null,

            rol_id:
              rol.id,

            rol_codigo:
              rol.codigo,

            rol_nombre:
              rol.nombre,

            rol_nivel:
              rol.nivel,
          },

          permisos,

          permisos_codigos,

          total_permisos:
            permisos_codigos.length,

          requiere_seleccion_perfil:
            false,

          error:
            "El rol del perfil seleccionado no tiene acceso a Administración.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 18. RESULTADO FINAL
    // ========================================================

    const resultado:
      ResultadoAutorizacion = {
        autorizado: true,

        usuario_id:
          usuario.id,

        asignacion_id:
          asignacionActiva.id,

        rol_id:
          asignacionActiva.rol_id,

        cargo_id:
          asignacionActiva.cargo_id,

        rol_codigo:
          rol.codigo,

        rol_nombre:
          rol.nombre,

        rol_nivel:
          rol.nivel,

        permisos,

        permisos_codigos,
      };

    // ========================================================
    // 19. RESPUESTA
    // ========================================================

    return NextResponse.json({
      success: true,

      autorizado: true,

      es_admin: esAdmin,

      es_super_admin:
        esSuperAdmin,

      usuario_id:
        resultado.usuario_id,

      perfil: {
        asignacion_id:
          resultado.asignacion_id,

        cargo_id:
          resultado.cargo_id,

        cargo_nombre:
          cargo?.nombre ?? null,

        rol_id:
          resultado.rol_id,

        rol_codigo:
          resultado.rol_codigo,

        rol_nombre:
          resultado.rol_nombre,

        rol_nivel:
          resultado.rol_nivel,
      },

      // ------------------------------------------------------
      // Permisos agrupados por módulo
      // ------------------------------------------------------

      permisos:
        resultado.permisos,

      // ------------------------------------------------------
      // Lista plana de códigos
      //
      // Ejemplo:
      //
      // [
      //   "USR_VIEW",
      //   "USR_CREATE",
      //   "ROL_VIEW"
      // ]
      // ------------------------------------------------------

      permisos_codigos:
        resultado.permisos_codigos,

      total_permisos:
        resultado.permisos_codigos.length,

      requiere_seleccion_perfil:
        false,
    });
  } catch (error) {
    console.error(
      "Error en /api/auth/autorizacion-administracion:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        autorizado: false,
        error:
          "Error interno validando la autorización administrativa.",
      },
      { status: 500 }
    );
  }
}