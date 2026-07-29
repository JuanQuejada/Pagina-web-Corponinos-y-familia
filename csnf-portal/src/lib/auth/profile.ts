// ============================================================
// PROFILE
// Portal Corporación Social Niños y Familia
// Gestión del Usuario Portal
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

function construirPerfilActivo(asignacion: UsuarioAsignacion): PerfilActivo {
  // Garantizamos acceso a las relaciones anidadas
  const cargo = asignacion?.cargo ?? null;
  const rol = asignacion?.rol ?? null;
  const departamento = (cargo as any)?.departamento ?? null;
  const area = (departamento as any)?.area ?? null;

  return {
    asignacion,
    cargo: cargo!,
    rol: rol!,
    departamento: departamento ?? undefined,
    area: area ?? undefined,
  };
}

// ============================================================
// CONSTRUIR USUARIO PORTAL
// ============================================================

function construirUsuarioPortal(
  usuarioBase: Usuario,
  asignaciones: UsuarioAsignacion[]
): UsuarioPortal {
  // 1. Buscar perfil predeterminado o tomar la primera asignación
  const asignacionPrincipal =
    asignaciones.find((a) => a.perfil_predeterminado) ??
    asignaciones[0] ??
    null;

  // 2. Construir el Perfil Activo
  const perfilActivo = asignacionPrincipal
    ? construirPerfilActivo(asignacionPrincipal)
    : null;

  // 3. Extender los datos del usuario con su rol/cargo predeterminado
  const usuario: Usuario = {
    ...usuarioBase,
    rol: perfilActivo?.rol,
    cargo: perfilActivo?.cargo,
    departamento: perfilActivo?.departamento,
    area: perfilActivo?.area,
  };

  // 4. Retornar la estructura final de UsuarioPortal
  return {
    usuario,
    asignaciones,
    perfilActivo,
    cargo: perfilActivo?.cargo,
    rol: perfilActivo?.rol,
    departamento: perfilActivo?.departamento,
    area: perfilActivo?.area,
    permisos: [],
    autenticado: true,
  };
}

// ============================================================
// OBTENER USUARIO PORTAL
// ============================================================

export async function obtenerUsuarioPortal(): Promise<UsuarioPortal | null> {
  //----------------------------------------------------------
  // 1. Obtener Usuario Autenticado en Supabase Auth
  //----------------------------------------------------------
  const auth = await obtenerUsuarioAuth();

  if (!auth.success || !auth.data) {
    return null;
  }

  //----------------------------------------------------------
  // 2. Consultar Usuario y Asignaciones en Base de Datos
  //----------------------------------------------------------
  const resultado = await databaseRepository.obtenerUsuarioPortal(
    auth.data.id
  );

  if (resultado.error || !resultado.data) {
    console.error("Error obteniendo usuario portal:", resultado.error);
    return null;
  }

  //----------------------------------------------------------
  // 3. Mapear Usuario e Información de Catálogos
  //----------------------------------------------------------
  const usuarioBase: Usuario = {
    ...resultado.data.usuario,
    email: auth.data.email ?? "",
    tipoPersona: resultado.data.usuario.tipoPersona,
    tipoIdentificacion: resultado.data.usuario.tipoIdentificacion,
    estadoUsuario: resultado.data.usuario.estadoUsuario,
  };

  // Extraer asignaciones (si viene una sola la convertimos en array)
  const asignacionesRaw = resultado.data.asignacion;
  const asignaciones: UsuarioAsignacion[] = asignacionesRaw
    ? Array.isArray(asignacionesRaw)
      ? asignacionesRaw
      : [asignacionesRaw]
    : [];

  //----------------------------------------------------------
  // 4. Construir y retornar UsuarioPortal centralizado
  //----------------------------------------------------------
  const usuarioPortal = construirUsuarioPortal(usuarioBase, asignaciones);

  console.log("Usuario Portal Generado:", usuarioPortal);

  return usuarioPortal;
}

// ============================================================
// OBTENER ASIGNACIONES
// ============================================================

export async function obtenerAsignacionesUsuario(): Promise<UsuarioAsignacion[]> {
  const usuario = await obtenerUsuarioPortal();
  return usuario?.asignaciones ?? [];
}

// ============================================================
// OBTENER PERFIL ACTIVO
// ============================================================

export async function obtenerPerfilActivo(): Promise<PerfilActivo | null> {
  const usuario = await obtenerUsuarioPortal();
  return usuario?.perfilActivo ?? null;
}

// ============================================================
// OBTENER ROL
// ============================================================

export async function obtenerRolActivo() {
  const perfil = await obtenerPerfilActivo();
  return perfil?.rol ?? null;
}

// ============================================================
// OBTENER CARGO
// ============================================================

export async function obtenerCargoActivo() {
  const perfil = await obtenerPerfilActivo();
  return perfil?.cargo ?? null;
}

// ============================================================
// OBTENER DEPARTAMENTO
// ============================================================

export async function obtenerDepartamentoActivo() {
  const perfil = await obtenerPerfilActivo();
  return perfil?.departamento ?? null;
}

// ============================================================
// OBTENER ÁREA
// ============================================================

export async function obtenerAreaActiva() {
  const perfil = await obtenerPerfilActivo();
  return perfil?.area ?? null;
}

// ============================================================
// OBTENER PERMISOS
// ============================================================

export async function obtenerPermisos(): Promise<Permiso[]> {
  const usuario = await obtenerUsuarioPortal();
  return usuario?.permisos ?? [];
}

// ============================================================
// VALIDAR PERMISO
// ============================================================

export async function tienePermiso(codigo: string): Promise<boolean> {
  const permisos = await obtenerPermisos();
  return permisos.some((permiso) => permiso.codigo === codigo);
}

// ============================================================
// VALIDAR PERFIL ACTIVO
// ============================================================

export async function tienePerfilActivo(): Promise<boolean> {
  const perfil = await obtenerPerfilActivo();
  return perfil !== null;
}

// ============================================================
// VALIDAR USUARIO PORTAL
// ============================================================

export async function existeUsuarioPortal(): Promise<boolean> {
  const usuario = await obtenerUsuarioPortal();
  return usuario !== null;
}

// ============================================================
// OBTENER USUARIO ACTUAL
// ============================================================

export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const usuarioPortal = await obtenerUsuarioPortal();
  return usuarioPortal?.usuario ?? null;
}

// ============================================================
// OBTENER PERFIL PRINCIPAL
// ============================================================

export async function obtenerPerfilPrincipal(): Promise<UsuarioAsignacion | null> {
  const usuario = await obtenerUsuarioPortal();
  return usuario?.perfilActivo?.asignacion ?? null;
}
