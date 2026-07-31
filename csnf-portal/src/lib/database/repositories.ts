// ============================================================
// DATABASE REPOSITORY
// Portal Corporación Social Niños y Familia
// Versión 1.0.6
// ============================================================

import { supabase } from "@/lib/supabase";

import type {
  Row,
  Insert,
  Update,
} from "@/lib/database";

import type {
  Usuario,
  UsuarioAsignacion,
  TipoPersona,
  TipoIdentificacion,
  EstadoUsuario,
  Cargo,
  Departamento,
  Area,
  Rol,
} from "@/types";

// ============================================================
// ALIAS BASE DE DATOS
// ============================================================

export type UsuarioDB = Row<"usuarios">;
export type UsuarioInsert = Insert<"usuarios">;
export type UsuarioUpdate = Update<"usuarios">;

export type AsignacionDB = Row<"usuarios_asignaciones">;

export type CargoDB = Row<"cargos">;
export type DepartamentoDB = Row<"departamentos">;
export type AreaDB = Row<"areas">;
export type RolDB = Row<"roles">;

// ============================================================
// ESTRUCTURA INTERNA
// ============================================================

interface ResultadoUsuarioPortal {
  usuario: Usuario;
  asignaciones: UsuarioAsignacion[];
}

// ============================================================
// REPOSITORY
// ============================================================

export const databaseRepository = {

  // ==========================================================
  // USUARIOS
  // ==========================================================

  async obtenerUsuarioPorId(usuarioId: string) {
    return await supabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioId)
      .maybeSingle();
  },

  async obtenerUsuarioPorAuthId(authUserId: string) {
    return await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
  },

  async actualizarUsuario(
    usuarioId: string,
    datos: UsuarioUpdate
  ) {
    return await supabase
      .from("usuarios")
      .update(datos)
      .eq("id", usuarioId)
      .select()
      .single();
  },

  async existeUsuario(usuarioId: string) {
    const { data } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", usuarioId)
      .maybeSingle();

    return data !== null;
  },

  // ==========================================================
  // FUNCIONES AUXILIARES PRIVADAS (INTERNAS)
  // ==========================================================

  async _obtenerTipoPersona(id: string | null): Promise<TipoPersona | null> {
    if (!id) return null;
    const { data } = await supabase
      .from("tipos_persona")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as TipoPersona | null;
  },

  async _obtenerTipoIdentificacion(id: string | null): Promise<TipoIdentificacion | null> {
    if (!id) return null;
    const { data } = await supabase
      .from("tipos_identificacion")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as TipoIdentificacion | null;
  },

  async _obtenerEstadoUsuario(id: string | null): Promise<EstadoUsuario | null> {
    if (!id) return null;
    const { data } = await supabase
      .from("estados_usuario")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as EstadoUsuario | null;
  },

  // ==========================================================
  // USUARIO PORTAL
  // ==========================================================

  async obtenerUsuarioPortal(
    authUserId: string
  ): Promise<{
    data: ResultadoUsuarioPortal | null;
    error: Error | null;
  }> {
    //---------------------------------------------------------
    // 1. Buscar usuario por auth_user_id
    //---------------------------------------------------------
    const usuarioResponse = await this.obtenerUsuarioPorAuthId(authUserId);

    if (usuarioResponse.error || !usuarioResponse.data) {
      return {
        data: null,
        error: usuarioResponse.error ?? new Error("Usuario no encontrado en la base de datos"),
      };
    }

    const usuarioDB = usuarioResponse.data;

    //---------------------------------------------------------
    // 2. Cargar catálogos y asignaciones en paralelo de forma segura
    //---------------------------------------------------------
    const [
      tipoPersona,
      tipoIdentificacion,
      estadoUsuario,
      asignacionesResponse
    ] = await Promise.all([
      this._obtenerTipoPersona(usuarioDB.tipo_persona_id),
      this._obtenerTipoIdentificacion(usuarioDB.tipo_identificacion_id),
      this._obtenerEstadoUsuario(usuarioDB.estado_usuario_id),
      this.obtenerAsignacionesUsuario(usuarioDB.id)
    ]);

    // Extraer datos de asignaciones (manejando si viene envuelto en objeto de supabase o array directo)
    const asignaciones: UsuarioAsignacion[] = Array.isArray(asignacionesResponse) 
      ? (asignacionesResponse as unknown as UsuarioAsignacion[]) 
      : ((asignacionesResponse as any)?.data ?? []);

    //---------------------------------------------------------
    // 3. Construir Usuario con sus relaciones mapeadas
    //---------------------------------------------------------
    const usuario: Usuario = {
      ...usuarioDB,
      tipoPersona: tipoPersona ?? undefined,
      tipoIdentificacion: tipoIdentificacion ?? undefined,
      estadoUsuario: estadoUsuario ?? undefined,
      foto_url: usuarioDB.foto_url,
      email: usuarioDB.email ?? undefined,
    };

    //---------------------------------------------------------
    // 4. Retornar información completa
    //---------------------------------------------------------
    return {
      data: {
        usuario,
        asignaciones,
      },
      error: null,
    };
  },

  // ==========================================================
  // ASIGNACIONES
  // ==========================================================

  async obtenerAsignacionesUsuario(usuarioId: string) {
    const { data, error } = await supabase
      .from("usuarios_asignaciones")
      .select(`
        *,
        rol:roles(*),
        cargo:cargos(
          *,
          departamento:departamentos(
            *,
            area:areas(*)
          )
        )
      `)
      .eq("usuario_id", usuarioId)
      .eq("activo", true)
      .order("perfil_predeterminado", {
        ascending: false,
      });

    if (error) {
      console.error("Error obteniendo asignaciones:", error);
      return [];
    }

    return (data ?? []) as unknown as UsuarioAsignacion[];
  },

  async obtenerAsignacion(asignacionId: string) {
    return await supabase
      .from("usuarios_asignaciones")
      .select(`
        *,
        rol:roles(*),
        cargo:cargos(
          *,
          departamento:departamentos(
            *,
            area:areas(*)
          )
        )
      `)
      .eq("id", asignacionId)
      .maybeSingle();
  },

  // ==========================================================
  // ÁREAS
  // ==========================================================

  async obtenerAreas() {
    return await supabase
      .from("areas")
      .select("*")
      .order("orden");
  },

  async obtenerAreaPorId(areaId: string) {
    return await supabase
      .from("areas")
      .select("*")
      .eq("id", areaId)
      .maybeSingle();
  },

  // ==========================================================
  // DEPARTAMENTOS
  // ==========================================================

  async obtenerDepartamentos() {
    return await supabase
      .from("departamentos")
      .select(`
        *,
        area:areas(*)
      `)
      .order("orden");
  },

  async obtenerDepartamentosPorArea(areaId: string) {
    return await supabase
      .from("departamentos")
      .select(`
        *,
        area:areas(*)
      `)
      .eq("area_id", areaId)
      .order("orden");
  },

  async obtenerDepartamentoPorId(departamentoId: string) {
    return await supabase
      .from("departamentos")
      .select(`
        *,
        area:areas(*)
      `)
      .eq("id", departamentoId)
      .maybeSingle();
  },

  // ==========================================================
  // CARGOS
  // ==========================================================

  async obtenerCargos() {
    return await supabase
      .from("cargos")
      .select(`
        *,
        departamento:departamentos(
          *,
          area:areas(*)
        )
      `)
      .order("orden");
  },

  async obtenerCargoPorId(cargoId: string) {
    return await supabase
      .from("cargos")
      .select(`
        *,
        departamento:departamentos(
          *,
          area:areas(*)
        )
      `)
      .eq("id", cargoId)
      .maybeSingle();
  },

  async obtenerCargosPorDepartamento(departamentoId: string) {
    return await supabase
      .from("cargos")
      .select(`
        *,
        departamento:departamentos(
          *,
          area:areas(*)
        )
      `)
      .eq("departamento_id", departamentoId)
      .order("orden");
  },

  // ==========================================================
  // ROLES
  // ==========================================================

  async obtenerRoles() {
    return await supabase
      .from("roles")
      .select("*")
      .order("nivel");
  },

  async obtenerRolPorId(rolId: string) {
    return await supabase
      .from("roles")
      .select("*")
      .eq("id", rolId)
      .maybeSingle();
  },

  // ==========================================================
  // MÓDULOS
  // ==========================================================

  async obtenerModulos() {
    return await supabase
      .from("modulos")
      .select("*")
      .order("orden");
  },

  async obtenerModuloPorId(moduloId: string) {
    return await supabase
      .from("modulos")
      .select("*")
      .eq("id", moduloId)
      .maybeSingle();
  },

  // ==========================================================
  // PERMISOS
  // ==========================================================

  async obtenerPermisos() {
    return await supabase
      .from("permisos")
      .select(`
        *,
        modulo:modulos(*)
      `)
      .order("orden");
  },

  async obtenerPermisosModulo(moduloId: string) {
    return await supabase
      .from("permisos")
      .select(`
        *,
        modulo:modulos(*)
      `)
      .eq("modulo_id", moduloId)
      .order("orden");
  },

  // ==========================================================
  // CATÁLOGOS
  // ==========================================================

  async obtenerTiposPersona() {
    return await supabase
      .from("tipos_persona")
      .select("*")
      .order("orden");
  },

  async obtenerTiposIdentificacion() {
    return await supabase
      .from("tipos_identificacion")
      .select(`
        *,
        tipo_persona:tipos_persona(*)
      `)
      .order("orden");
  },

  async obtenerTiposIdentificacionPorPersona(tipoPersonaId: string) {
    return await supabase
      .from("tipos_identificacion")
      .select("*")
      .eq("tipo_persona_id", tipoPersonaId)
      .order("orden");
  },

  async obtenerEstadosUsuario() {
    return await supabase
      .from("estados_usuario")
      .select("*")
      .order("orden");
  },

  // ==========================================================
  // CONFIGURACIÓN GENERAL
  // ==========================================================

  async obtenerConfiguracionGeneral() {
    return await supabase
      .from("configuracion_general")
      .select("*")
      .maybeSingle();
  },

  async actualizarConfiguracionGeneral(datos: Update<"configuracion_general">) {
    return await supabase
      .from("configuracion_general")
      .update(datos)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select()
      .single();
  },

  // ==========================================================
  // AUDITORÍA
  // ==========================================================

  async registrarAuditoria(datos: Insert<"auditoria">) {
    return await supabase
      .from("auditoria")
      .insert(datos);
  }

};

// ============================================================
// EXPORT
// ============================================================

export default databaseRepository;