// ============================================================
// TYPES - PORTAL CSNF
// Corporación Social Niños y Familia
// Arquitectura Oficial v2.0
// ============================================================

import type { Database } from "@/lib/database/database.types";

// ============================================================
// TIPOS BASE
// ============================================================

export type UUID = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ============================================================
// ALIAS DE BASE DE DATOS
// (NO MODIFICAR)
// ============================================================

type PublicSchema = Database["public"];

export type DBTable<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Row"];

export type DBInsert<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Insert"];

export type DBUpdate<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Update"];

// ============================================================
// RESPUESTAS API
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
}

export interface Paginacion<T> {
  data: T[];
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

// ============================================================
// TIPOS COMUNES
// ============================================================

export interface SelectOption {
  value: UUID;
  label: string;
}

export interface AuditoriaBasica {
  created_at?: string;
  updated_at?: string;
  created_by?: UUID | null;
  updated_by?: UUID | null;
}

// ============================================================
// ALIAS DE TABLAS
// ============================================================

export type DBArea = DBTable<"areas">;

export type DBDepartamento = DBTable<"departamentos">;

export type DBCargo = DBTable<"cargos">;

export type DBRol = DBTable<"roles">;

export type DBUsuario = DBTable<"usuarios">;

export type DBUsuarioAsignacion = DBTable<"usuarios_asignaciones">;

export type DBTipoPersona = DBTable<"tipos_persona">;

export type DBTipoIdentificacion = DBTable<"tipos_identificacion">;

export type DBEstadoUsuario = DBTable<"estados_usuario">;

export type DBModulo = DBTable<"modulos">;

export type DBPermiso = DBTable<"permisos">;

// ============================================================
// CATÁLOGOS
// ============================================================

export interface TipoPersona extends DBTipoPersona {}

export interface TipoIdentificacion extends DBTipoIdentificacion {
  tipo_persona?: TipoPersona;
}

export interface EstadoUsuario extends DBEstadoUsuario {}

// ============================================================
// ORGANIZACIÓN
// ============================================================

export interface Area extends DBArea {}

export interface Departamento extends DBDepartamento {
  area?: Area;
}

export interface Cargo extends DBCargo {
  departamento?: Departamento;
  cargoSuperior?: Cargo | null;
}

export interface Rol extends DBRol {
  permisosSistema?: Permiso[];
}

export interface Modulo extends DBModulo {}

export interface Permiso extends DBPermiso {
  moduloRelacion?: Modulo;
}

// ============================================================
// ASIGNACIÓN DE USUARIO
// ============================================================

export interface UsuarioAsignacion extends DBUsuarioAsignacion {
  cargo?: Cargo;
  rol?: Rol;
}

// ============================================================
// PERFILES ACTIVOS
// ============================================================

export interface PerfilActivo {
  asignacion: UsuarioAsignacion;
  cargo: Cargo;
  rol: Rol;
  departamento?: Departamento;
  area?: Area;
}

// ============================================================
// NAVEGACIÓN
// ============================================================

export interface MenuItem {
  id: string;
  titulo: string;
  icono?: string;
  ruta: string;
  modulo?: string;
  permiso?: string;
  hijos?: MenuItem[];
}

// ============================================================
// BREADCRUMB
// ============================================================

export interface Breadcrumb {
  titulo: string;
  ruta?: string;
}

// ============================================================
// USUARIO
// ============================================================

export interface Usuario extends Omit<DBUsuario, 'email' | 'foto_url' | 'avatar_url'> {
  //----------------------------------------------------------
  // Datos provenientes de Auth
  //----------------------------------------------------------
  email?: string;

  //----------------------------------------------------------
  // Multimedia / Perfil
  //----------------------------------------------------------
  foto_url?: string | null;
  nombreCompleto?: string;

  // Catálogos
  tipoPersona?: TipoPersona | null;
  tipoIdentificacion?: TipoIdentificacion | null;
  estadoUsuario?: EstadoUsuario | null;

  // Organización (Soporta objetos o strings para evitar incompatibilidades)
  rol?: Rol | any;
  cargo?: Cargo | any;
  departamento?: Departamento;
  area?: Area;
}

// ============================================================
// USUARIO DEL PORTAL
// ============================================================

export interface UsuarioPortal {
  // ----------------------------------------------------------
  // Información básica
  // ----------------------------------------------------------
  usuario: Usuario;

  // ----------------------------------------------------------
  // Asignaciones del usuario
  // ----------------------------------------------------------
  asignaciones: UsuarioAsignacion[];

  // ----------------------------------------------------------
  // Perfil actualmente seleccionado
  // ----------------------------------------------------------
  perfilActivo: PerfilActivo | null;

  // ----------------------------------------------------------
  // Accesos rápidos
  // ----------------------------------------------------------
  cargo?: Cargo;
  rol?: Rol;
  departamento?: Departamento;
  area?: Area;

  // ----------------------------------------------------------
  // Seguridad
  // ----------------------------------------------------------
  permisos: Permiso[];
  autenticado: boolean;
}

// ============================================================
// SESIÓN
// ============================================================

export interface SesionPortal {
  usuario: UsuarioPortal;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

// ============================================================
// LOGIN
// ============================================================

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface ResultadoLogin {
  success: boolean;
  usuario?: UsuarioPortal;
  message?: string;
  error?: string;
}

// ============================================================
// CAMBIO DE CONTRASEÑA
// ============================================================

export interface CambioPassword {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}

// ============================================================
// PERFIL DE USUARIO
// ============================================================

export interface ActualizarPerfil {
  telefono?: string | null;
  direccion?: string | null;
  foto_url?: string | null;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardResumen {
  documentosPendientes: number;
  documentosFirmados: number;
  eventosHoy: number;
  notificaciones: number;
}