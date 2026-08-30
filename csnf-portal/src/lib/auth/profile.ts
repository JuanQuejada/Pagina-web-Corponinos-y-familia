// ============================================================
// PROFILE
// Portal Corporación Social Niños y Familia
// Gestión centralizada del usuario y perfil activo
// ============================================================

import type {
  UsuarioPortal,
  Usuario,
  UsuarioAsignacion,
  PerfilActivo,
  Permiso,
} from "@/types";

import { obtenerUsuarioAuth } from "@/lib/auth/auth-client";
import databaseRepository from "@/lib/database/repositories";

// ============================================================
// CONSTRUIR PERFIL ACTIVO
// ============================================================

function construirPerfilActivo(
  asignacion: UsuarioAsignacion
): PerfilActivo {
  const cargo =
    asignacion?.cargo ??
    (asignacion as any)?.cargos ??
    null;

  const rol =
    asignacion?.rol ??
    (asignacion as any)?.roles ??
    null;

  const departamento =
    cargo?.departamento ??
    (cargo as any)?.departamentos ??
    null;

  const area =
    departamento?.area ??
    (departamento as any)?.areas ??
    null;

  return {
    asignacion,
    cargo: cargo!,
    rol: rol!,
    departamento: departamento ?? undefined,
    area: area ?? undefined,
  };
}

// ============================================================
// OBTENER ID DE ASIGNACIÓN SELECCIONADA
// ============================================================
//
// El perfil seleccionado se conserva en sessionStorage para
// el navegador y se valida nuevamente contra las asignaciones
// reales obtenidas desde la base de datos.
//
// IMPORTANTE:
// sessionStorage NO es una fuente de confianza para seguridad.
// Solo sirve para recordar la selección del usuario.
// La API debe volver a validar la asignación.
//

function obtenerAsignacionSeleccionadaId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(
      "csnf_perfil_activo"
    );
  } catch {
    return null;
  }
}

// ============================================================
// GUARDAR ID DE ASIGNACIÓN SELECCIONADA
// ============================================================

export function guardarAsignacionSeleccionada(
  asignacionId: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      "csnf_perfil_activo",
      asignacionId
    );
  } catch {
    // No hacemos fallar la aplicación por sessionStorage.
  }
}

// ============================================================
// LIMPIAR PERFIL SELECCIONADO
// ============================================================

export function limpiarAsignacionSeleccionada(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(
      "csnf_perfil_activo"
    );
  } catch {
    // Ignorar errores de storage.
  }
}

// ============================================================
// CONSTRUIR USUARIO PORTAL
// ============================================================

function construirUsuarioPortal(
  usuarioBase: Usuario,
  asignaciones: UsuarioAsignacion[]
): UsuarioPortal {

  // ----------------------------------------------------------
  // 1. Determinar asignación activa
  // ----------------------------------------------------------

  const asignacionSeleccionadaId =
    obtenerAsignacionSeleccionadaId();

  let asignacionPrincipal: UsuarioAsignacion | null =
    null;

  // Primero intentamos utilizar el perfil seleccionado.
  if (asignacionSeleccionadaId) {
    asignacionPrincipal =
      asignaciones.find(
        (a) => a.id === asignacionSeleccionadaId
      ) ?? null;
  }

  // ----------------------------------------------------------
  // 2. Si no hay selección:
  //
  //    - una sola asignación -> acceso directo
  //    - varias asignaciones -> predeterminada
  //      solamente como fallback técnico
  // ----------------------------------------------------------

  if (!asignacionPrincipal) {

    if (asignaciones.length === 1) {

      asignacionPrincipal =
        asignaciones[0];

    } else if (asignaciones.length > 1) {

      asignacionPrincipal =
        asignaciones.find(
          (a: any) =>
            a.perfil_predeterminado === true ||
            a.predeterminado === true
        ) ??
        null;
    }
  }

  // ----------------------------------------------------------
  // 3. Construir perfil
  // ----------------------------------------------------------

  const perfilActivo =
    asignacionPrincipal
      ? construirPerfilActivo(asignacionPrincipal)
      : null;

  // ----------------------------------------------------------
  // 4. Usuario extendido
  // ----------------------------------------------------------

  const usuario: Usuario = {
    ...usuarioBase,

    rol:
      perfilActivo?.rol,

    cargo:
      perfilActivo?.cargo,

    departamento:
      perfilActivo?.departamento,

    area:
      perfilActivo?.area,
  };

  // ----------------------------------------------------------
  // 5. UsuarioPortal
  // ----------------------------------------------------------

  return {
    usuario,

    asignaciones,

    perfilActivo,

    cargo:
      perfilActivo?.cargo,

    rol:
      perfilActivo?.rol,

    departamento:
      perfilActivo?.departamento,

    area:
      perfilActivo?.area,

    permisos: [],

    autenticado: true,
  };
}

// ============================================================
// OBTENER USUARIO PORTAL
// ============================================================

export async function obtenerUsuarioPortal():
  Promise<UsuarioPortal | null> {

  // ----------------------------------------------------------
  // 1. Usuario autenticado
  // ----------------------------------------------------------

  const auth =
    await obtenerUsuarioAuth();

  if (!auth.success || !auth.data) {
    return null;
  }

  // ----------------------------------------------------------
  // 2. Usuario en base de datos
  // ----------------------------------------------------------

  const resultado =
    await databaseRepository.obtenerUsuarioPortal(
      auth.data.id
    );

  if (
    resultado.error ||
    !resultado.data
  ) {

    console.error(
      "Error obteniendo usuario portal:",
      resultado.error
    );

    return null;
  }

  const rawUser =
    resultado.data.usuario;

  // ----------------------------------------------------------
  // 3. Catálogos
  // ----------------------------------------------------------

  const tipoPersona =
    rawUser.tipoPersona ??
    (rawUser as any).tipos_persona ??
    null;

  const tipoIdentificacion =
    rawUser.tipoIdentificacion ??
    (rawUser as any).tipos_identificacion ??
    null;

  const estadoUsuario =
    rawUser.estadoUsuario ??
    (rawUser as any).estados_usuario ??
    null;

  // ----------------------------------------------------------
  // 4. Nombre mostrado
  // ----------------------------------------------------------

  const tipoPersonaCodigo =
    tipoPersona?.codigo?.toUpperCase() ?? "";

  const esJuridica =
    tipoPersonaCodigo === "JUR";

  const nombreMostrado =
    esJuridica

      ? (
          rawUser.razon_social ||
          "Sin razón social"
        )

      : (
          `${rawUser.nombres ?? ""} ${
            rawUser.apellidos ?? ""
          }`.trim() ||
          "Sin nombre"
        );

  // ----------------------------------------------------------
  // 5. Usuario base
  // ----------------------------------------------------------

  const usuarioBase: Usuario = {

    ...rawUser,

    email:
      rawUser.email ??
      auth.data.email ??
      "",

    nombreCompleto:
      nombreMostrado,

    tipoPersona:
      tipoPersona ??
      undefined,

    tipoIdentificacion:
      tipoIdentificacion ??
      undefined,

    estadoUsuario:
      estadoUsuario ??
      undefined,
  };

  // ----------------------------------------------------------
  // 6. Asignaciones
  // ----------------------------------------------------------

  const asignacionesRaw =
    resultado.data.asignaciones;

  const asignaciones:
    UsuarioAsignacion[] =

    asignacionesRaw

      ? Array.isArray(asignacionesRaw)

        ? asignacionesRaw

        : [asignacionesRaw]

      : [];

  // ----------------------------------------------------------
  // 7. Construir portal
  // ----------------------------------------------------------

  return construirUsuarioPortal(
    usuarioBase,
    asignaciones
  );
}

// ============================================================
// OBTENER ASIGNACIONES
// ============================================================

export async function obtenerAsignacionesUsuario():
  Promise<UsuarioAsignacion[]> {

  const usuario =
    await obtenerUsuarioPortal();

  return usuario?.asignaciones ?? [];
}

// ============================================================
// OBTENER PERFIL ACTIVO
// ============================================================

export async function obtenerPerfilActivo():
  Promise<PerfilActivo | null> {

  const usuario =
    await obtenerUsuarioPortal();

  return usuario?.perfilActivo ?? null;
}

// ============================================================
// OBTENER ROL
// ============================================================

export async function obtenerRolActivo():
  Promise<PerfilActivo["rol"] | null> {

  const perfil =
    await obtenerPerfilActivo();

  return perfil?.rol ?? null;
}

// ============================================================
// OBTENER CARGO
// ============================================================

export async function obtenerCargoActivo():
  Promise<PerfilActivo["cargo"] | null> {

  const perfil =
    await obtenerPerfilActivo();

  return perfil?.cargo ?? null;
}

// ============================================================
// OBTENER DEPARTAMENTO
// ============================================================

export async function obtenerDepartamentoActivo():
  Promise<PerfilActivo["departamento"] | null> {

  const perfil =
    await obtenerPerfilActivo();

  return perfil?.departamento ?? null;
}

// ============================================================
// OBTENER ÁREA
// ============================================================

export async function obtenerAreaActiva():
  Promise<PerfilActivo["area"] | null> {

  const perfil =
    await obtenerPerfilActivo();

  return perfil?.area ?? null;
}

// ============================================================
// OBTENER PERMISOS
// ============================================================

export async function obtenerPermisos():
  Promise<Permiso[]> {

  const usuario =
    await obtenerUsuarioPortal();

  return usuario?.permisos ?? [];
}

// ============================================================
// VALIDAR PERMISO
// ============================================================

export async function tienePermiso(
  codigo: string
): Promise<boolean> {

  const permisos =
    await obtenerPermisos();

  return permisos.some(
    (permiso) =>
      permiso.codigo === codigo
  );
}

// ============================================================
// VALIDAR PERFIL ACTIVO
// ============================================================

export async function tienePerfilActivo():
  Promise<boolean> {

  const perfil =
    await obtenerPerfilActivo();

  return perfil !== null;
}

// ============================================================
// VALIDAR USUARIO PORTAL
// ============================================================

export async function existeUsuarioPortal():
  Promise<boolean> {

  const usuario =
    await obtenerUsuarioPortal();

  return usuario !== null;
}

// ============================================================
// OBTENER USUARIO ACTUAL
// ============================================================

export async function obtenerUsuarioActual():
  Promise<Usuario | null> {

  const usuarioPortal =
    await obtenerUsuarioPortal();

  return usuarioPortal?.usuario ?? null;
}

// ============================================================
// OBTENER PERFIL PRINCIPAL
// ============================================================

export async function obtenerPerfilPrincipal():
  Promise<UsuarioAsignacion | null> {

  const usuario =
    await obtenerUsuarioPortal();

  return (
    usuario
      ?.perfilActivo
      ?.asignacion ??
    null
  );
}