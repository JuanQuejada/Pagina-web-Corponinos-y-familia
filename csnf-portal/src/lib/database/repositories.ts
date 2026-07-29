// ============================================================
// DATABASE REPOSITORIES
// Portal Corporación Social Niños y Familia
// ============================================================

import { supabase } from "@/lib/supabase";

import type {
  Row,
  Insert,
  Update,
} from "@/lib/database";

// ============================================================
// ALIAS
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
// INTERFACES
// ============================================================

interface UsuarioPortalDB extends Omit<UsuarioDB, 'email' | 'foto_url'> {

  email?: string | null;
  tipoPersona?: any;
  foto_url?: string | null;
  tipoIdentificacion?: any;
  estadoUsuario?: any;

}

interface ResultadoUsuarioPortal {

  usuario: UsuarioPortalDB;
  asignacion: any;

}

// ============================================================
// REPOSITORIO
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

    const { data } =
      await supabase
        .from("usuarios")
        .select("id")
        .eq("id", usuarioId)
        .maybeSingle();

    return data !== null;

  },

  // ==========================================================
  // CATÁLOGOS DEL USUARIO
  // ==========================================================

  async obtenerTipoPersonaPorId(id: string) {

    const response = await supabase
      .from("tipos_persona")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  
      console.log(
        "Respuesta Tipo Persona:",
        JSON.stringify(response, null, 2)
      );
  
    return response;
  
  },

  async obtenerTipoIdentificacionPorId(id: string) {

    console.log("Buscando Tipo Identificación:", id);
  
    const response = await supabase
      .from("tipos_identificacion")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  
      console.log(
        "Respuesta Tipo Identificación:",
        JSON.stringify(response, null, 2)
      );
  
    return response;
  
  },

  async obtenerEstadoUsuarioPorId(id: string) {

    console.log("Buscando Estado Usuario:", id);
  
    const response = await supabase
      .from("estados_usuario")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  
      console.log(
        "Respuesta Estado Usuario:",
        JSON.stringify(response, null, 2)
      );
  
    return response;
  
  },

  // ==========================================================
  // PERFIL ACTIVO
  // ==========================================================
  
  async obtenerPerfilPredeterminado(usuarioId: string) {
    const response = await supabase
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
      .eq("perfil_predeterminado", true)
      .eq("activo", true)
      .maybeSingle();
  
    return response;
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

    //--------------------------------------------------------
    // Usuario
    //--------------------------------------------------------

    const usuarioResponse =
      await this.obtenerUsuarioPorAuthId(authUserId);

    if (
      usuarioResponse.error ||
      !usuarioResponse.data
    ) {

      return {

        data: null,

        error:
          usuarioResponse.error ??
          new Error("Usuario no encontrado"),

      };

    }

    const usuario =
      usuarioResponse.data;

    //--------------------------------------------------------
    // Catálogos
    //--------------------------------------------------------

    const [
      tipoPersonaResponse,
      tipoIdentificacionResponse,
      estadoUsuarioResponse,
      perfilActivoResponse,
    ] = await Promise.all([
    
      usuario.tipo_persona_id
        ? this.obtenerTipoPersonaPorId(usuario.tipo_persona_id)
        : Promise.resolve({ data: null }),
    
      usuario.tipo_identificacion_id
        ? this.obtenerTipoIdentificacionPorId(
            usuario.tipo_identificacion_id
          )
        : Promise.resolve({ data: null }),
    
      usuario.estado_usuario_id
        ? this.obtenerEstadoUsuarioPorId(
            usuario.estado_usuario_id
          )
        : Promise.resolve({ data: null }),
    
      this.obtenerPerfilPredeterminado(usuario.id),
    
    ]);
    
    console.log(
      "Tipo Persona:",
      JSON.stringify(tipoPersonaResponse, null, 2)
    );
    console.log(
      "Tipo Identificación:",
      JSON.stringify(tipoIdentificacionResponse, null, 2)
    );
    console.log(
      "Estado Usuario:",
      JSON.stringify(estadoUsuarioResponse, null, 2)
    );
    console.log(
      "Perfil Activo:",
      JSON.stringify(perfilActivoResponse, null, 2)
    );
    
    return {

      data: {
    
        usuario: {
    
          ...usuario,

          foto_url: (usuario as any).foto_url ?? null,
    
          tipoPersona:
            tipoPersonaResponse.data ?? null,
    
          tipoIdentificacion:
            tipoIdentificacionResponse.data ?? null,
    
          estadoUsuario:
            estadoUsuarioResponse.data ?? null,
    
        },
    
        asignacion:
          perfilActivoResponse.data ?? null,
    
      },
    
      error: null,
    
    };

  },

    // ==========================================================
  // ASIGNACIONES DE USUARIO
  // ==========================================================

  async obtenerAsignacionesUsuario(usuarioId: string) {

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
      .eq("usuario_id", usuarioId)
      .eq("activo", true)
      .order("perfil_predeterminado", {
        ascending: false,
      });

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

  async actualizarPerfilPredeterminado(
    usuarioId: string,
    asignacionId: string
  ) {

    await supabase
      .from("usuarios_asignaciones")
      .update({
        perfil_predeterminado: false,
      })
      .eq("usuario_id", usuarioId);

    return await supabase
      .from("usuarios_asignaciones")
      .update({
        perfil_predeterminado: true,
      })
      .eq("id", asignacionId)
      .select()
      .single();

  },

  // ==========================================================
  // ÁREAS
  // ==========================================================

  async obtenerAreas() {

    return await supabase
      .from("areas")
      .select("*")
      .eq("activo", true)
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
      .eq("activo", true)
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
      .eq("activo", true)
      .order("orden");

  },

  async obtenerDepartamentoPorId(
    departamentoId: string
  ) {

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
      .eq("activo", true)
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

  async obtenerCargosPorDepartamento(
    departamentoId: string
  ) {

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
      .eq("activo", true)
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
      .eq("activo", true)
      .order("orden");

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
      .eq("activo", true);

  },

  async obtenerPermisosModulo(
    moduloId: string
  ) {

    return await supabase
      .from("permisos")
      .select(`
        *,
        modulo:modulos(*)
      `)
      .eq("modulo_id", moduloId)
      .eq("activo", true);

  },

  // ==========================================================
  // CATÁLOGOS
  // ==========================================================

  async obtenerTiposPersona() {

    return await supabase
      .from("tipos_persona")
      .select("*")
      .eq("activo", true)
      .order("orden");

  },

  async obtenerTiposIdentificacion() {

    return await supabase
      .from("tipos_identificacion")
      .select(`
        *,
        tipo_persona:tipos_persona(*)
      `)
      .eq("activo", true)
      .order("orden");

  },

  async obtenerTiposIdentificacionPorPersona(
    tipoPersonaId: string
  ) {

    return await supabase
      .from("tipos_identificacion")
      .select("*")
      .eq("tipo_persona_id", tipoPersonaId)
      .eq("activo", true)
      .order("orden");

  },

  async obtenerEstadosUsuario() {

    return await supabase
      .from("estados_usuario")
      .select("*")
      .eq("activo", true)
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

  async actualizarConfiguracionGeneral(
    datos: Update<"configuracion_general">
  ) {

    return await supabase
      .from("configuracion_general")
      .update(datos)
      .neq(
        "id",
        "00000000-0000-0000-0000-000000000000"
      )
      .select()
      .single();

  },

  // ==========================================================
  // AUDITORÍA
  // ==========================================================

  async registrarAuditoria(
    datos: Insert<"auditoria">
  ) {

    return await supabase
      .from("auditoria")
      .insert(datos);

  },

};

// ============================================================
// EXPORT
// ============================================================

export default databaseRepository;