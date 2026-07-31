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
  // Garantizamos acceso seguro a las relaciones anidadas y manejamos alias de Supabase
  const cargo = asignacion?.cargo ?? (asignacion as any)?.cargos ?? null;
  const rol = asignacion?.rol ?? (asignacion as any)?.roles ?? null;
  
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
// CONSTRUIR USUARIO PORTAL
// ============================================================

function construirUsuarioPortal(
  usuarioBase: Usuario,
  asignaciones: UsuarioAsignacion[]
): UsuarioPortal {
  // 1. Buscar perfil predeterminado o tomar la primera asignación activa/disponible
  const asignacionPrincipal =
    asignaciones.find((a: any) => a.perfil_predeterminado || a.predeterminado) ??
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

  // 4. Retornar la estructura final de UsuarioPortal asegurando compatibilidad con vistas
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

  const rawUser = resultado.data.usuario;

  //----------------------------------------------------------
  // 3. Mapear Usuario e Información de Catálogos de Forma Robusta
  //----------------------------------------------------------
  
  // Extraemos de forma segura los catálogos ya resueltos en el objeto del repositorio
  const tipoPersona = rawUser.tipoPersona ?? (rawUser as any).tipos_persona ?? null;
  const tipoIdentificacion = rawUser.tipoIdentificacion ?? (rawUser as any).tipos_identificacion ?? null;
  const estadoUsuario = rawUser.estadoUsuario ?? (rawUser as any).estados_usuario ?? null;

  // Determinamos el nombre para mostrar según si es persona natural o jurídica
  const tipoPersonaCodigo = tipoPersona?.codigo?.toUpperCase() ?? "";
  const esJuridica = tipoPersonaCodigo === "JUR";

  const nombreMostrado = esJuridica
    ? (rawUser.razon_social || "Sin razón social")
    : `${rawUser.nombres ?? ""} ${rawUser.apellidos ?? ""}`.trim() || "Sin nombre";

  const usuarioBase: Usuario = {
    ...rawUser,
    email: rawUser.email ?? auth.data.email ?? "",
    nombreCompleto: nombreMostrado,
    tipoPersona: tipoPersona ?? undefined,
    tipoIdentificacion: tipoIdentificacion ?? undefined,
    estadoUsuario: estadoUsuario ?? undefined,
  };

  // Extraer asignaciones (si viene una sola la convertimos en array)
  const asignacionesRaw = resultado.data.asignaciones;
  const asignaciones: UsuarioAsignacion[] = asignacionesRaw
    ? Array.isArray(asignacionesRaw)
      ? asignacionesRaw
      : [asignacionesRaw]
    : [];

  //----------------------------------------------------------
  // 4. Construir y retornar UsuarioPortal centralizado
  //----------------------------------------------------------
  const usuarioPortal = construirUsuarioPortal(usuarioBase, asignaciones);

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