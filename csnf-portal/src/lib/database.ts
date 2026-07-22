// ============================================================
// DATABASE TYPES - CSNiños y Familia Portal
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {

      // ======================================================
      // USUARIOS
      // ======================================================

      usuarios: {
        Row: {
          id: string;
          email: string;
          password_hash: string;

          tipo_persona: "natural" | "juridica";
          tipo_usuario:
            | "Representante Legal"
            | "Ejecutivo"
            | "Jefe Área o Departamento"
            | "Empleado"
            | "Proveedor";

          razon_social: string | null;
          nombres: string | null;
          apellidos: string | null;

          tipo_documento:
            | "CC"
            | "CE"
            | "Pasaporte"
            | "NIT"
            | null;

          numero_documento: string | null;
          telefono: string | null;
          direccion: string | null;
          fecha_nacimiento: string | null;
          foto_url: string | null;

          rol_id: string;
          area_id: string | null;
          departamento_id: string | null;

          cargo: string | null;
          fecha_vinculacion: string | null;
          tipo_contrato: string | null;
          jefe_directo_id: string | null;

          perfil_completo: boolean;
          password_cambiada: boolean;
          activo: boolean;
          ultimo_login: string | null;

          created_at: string;
          updated_at: string;
          created_by: string | null;
        };

        Insert: {
          id?: string;
          email: string;
          password_hash: string;

          tipo_persona?: "natural" | "juridica";

          tipo_usuario?:
            | "Representante Legal"
            | "Ejecutivo"
            | "Jefe Área o Departamento"
            | "Empleado"
            | "Proveedor";

          razon_social?: string | null;
          nombres?: string | null;
          apellidos?: string | null;

          tipo_documento?:
            | "CC"
            | "CE"
            | "Pasaporte"
            | "NIT"
            | null;

          numero_documento?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          fecha_nacimiento?: string | null;
          foto_url?: string | null;

          rol_id: string;
          area_id?: string | null;
          departamento_id?: string | null;

          cargo?: string | null;
          fecha_vinculacion?: string | null;
          tipo_contrato?: string | null;
          jefe_directo_id?: string | null;

          perfil_completo?: boolean;
          password_cambiada?: boolean;
          activo?: boolean;
          ultimo_login?: string | null;

          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };

        Update: {
          email?: string;
          password_hash?: string;

          tipo_persona?: "natural" | "juridica";

          tipo_usuario?:
            | "Representante Legal"
            | "Ejecutivo"
            | "Jefe Área o Departamento"
            | "Empleado"
            | "Proveedor";

          razon_social?: string | null;
          nombres?: string | null;
          apellidos?: string | null;

          tipo_documento?:
            | "CC"
            | "CE"
            | "Pasaporte"
            | "NIT"
            | null;

          numero_documento?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          fecha_nacimiento?: string | null;
          foto_url?: string | null;

          rol_id?: string;
          area_id?: string | null;
          departamento_id?: string | null;

          cargo?: string | null;
          fecha_vinculacion?: string | null;
          tipo_contrato?: string | null;
          jefe_directo_id?: string | null;

          perfil_completo?: boolean;
          password_cambiada?: boolean;
          activo?: boolean;
          ultimo_login?: string | null;

          updated_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: "usuarios_rol_id_fkey";
            columns: ["rol_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_area_id_fkey";
            columns: ["area_id"];
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_departamento_id_fkey";
            columns: ["departamento_id"];
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_jefe_directo_id_fkey";
            columns: ["jefe_directo_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      },
            // ======================================================
      // ROLES
      // ======================================================

      roles: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          nivel: number;
          permisos: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          nivel: number;
          permisos?: Json;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          descripcion?: string | null;
          nivel?: number;
          permisos?: Json;
        };
        Relationships: [];
      },

      // ======================================================
      // ÁREAS
      // ======================================================

      areas: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          orden: number;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          orden?: number;
          activa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nombre?: string;
          descripcion?: string | null;
          orden?: number;
          activa?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      },

      // ======================================================
      // DEPARTAMENTOS
      // ======================================================

      departamentos: {
        Row: {
          id: string;
          area_id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          area_id: string;
          nombre: string;
          descripcion?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          area_id?: string;
          nombre?: string;
          descripcion?: string | null;
          activo?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departamentos_area_id_fkey";
            columns: ["area_id"];
            referencedRelation: "areas";
            referencedColumns: ["id"];
          }
        ];
      },
            // ======================================================
      // DOCUMENTOS
      // ======================================================

      documentos:{
        Row:{
          id:string;
          titulo:string;
          descripcion:string|null;
          tipo_documento_id:string;
          estado:string;
          es_flujo_firma:boolean;
          es_publicidad:boolean;
          nombre_archivo:string|null;
          extension:string|null;
          tamano_bytes:number|null;
          mime_type:string|null;
          drive_file_id:string|null;
          drive_folder_id:string|null;
          drive_url:string|null;
          drive_folder_path:string|null;
          version:number;
          versiones_anteriores:Json;
          firmas_requeridas:number;
          firmas_completadas:number;
          firmantes:Json;
          visible_para:Json;
          fecha_publicacion:string|null;
          autor_id:string;
          area_id:string|null;
          aprobado_por:string|null;
          fecha_aprobacion:string|null;
          created_at:string;
          updated_at:string;
        };
        Insert:{
          id?:string;
          titulo:string;
          descripcion?:string|null;
          tipo_documento_id:string;
          estado?:string;
          es_flujo_firma?:boolean;
          es_publicidad?:boolean;
          nombre_archivo?:string|null;
          extension?:string|null;
          tamano_bytes?:number|null;
          mime_type?:string|null;
          drive_file_id?:string|null;
          drive_folder_id?:string|null;
          drive_url?:string|null;
          drive_folder_path?:string|null;
          version?:number;
          versiones_anteriores?:Json;
          firmas_requeridas?:number;
          firmas_completadas?:number;
          firmantes?:Json;
          visible_para?:Json;
          fecha_publicacion?:string|null;
          autor_id:string;
          area_id?:string|null;
          aprobado_por?:string|null;
          fecha_aprobacion?:string|null;
          created_at?:string;
          updated_at?:string;
        };
        Update:{
          titulo?:string;
          descripcion?:string|null;
          tipo_documento_id?:string;
          estado?:string;
          es_flujo_firma?:boolean;
          es_publicidad?:boolean;
          nombre_archivo?:string|null;
          extension?:string|null;
          tamano_bytes?:number|null;
          mime_type?:string|null;
          drive_file_id?:string|null;
          drive_folder_id?:string|null;
          drive_url?:string|null;
          drive_folder_path?:string|null;
          version?:number;
          versiones_anteriores?:Json;
          firmas_requeridas?:number;
          firmas_completadas?:number;
          firmantes?:Json;
          visible_para?:Json;
          fecha_publicacion?:string|null;
          area_id?:string|null;
          aprobado_por?:string|null;
          fecha_aprobacion?:string|null;
          updated_at?:string;
        };
        Relationships:[
          {
            foreignKeyName:"documentos_tipo_documento_id_fkey";
            columns:["tipo_documento_id"];
            referencedRelation:"tipos_documento";
            referencedColumns:["id"];
          },
          {
            foreignKeyName:"documentos_autor_id_fkey";
            columns:["autor_id"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          },
          {
            foreignKeyName:"documentos_area_id_fkey";
            columns:["area_id"];
            referencedRelation:"areas";
            referencedColumns:["id"];
          },
          {
            foreignKeyName:"documentos_aprobado_por_fkey";
            columns:["aprobado_por"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          }
        ];
      },

      // ======================================================
      // TIPOS DE DOCUMENTO
      // ======================================================

      tipos_documento:{
        Row:{
          id:string;
          nombre:string;
          descripcion:string|null;
          requiere_firma:boolean;
          carpeta_drive:string;
          orden:number;
          activo:boolean;
        };
        Insert:{
          id?:string;
          nombre:string;
          descripcion?:string|null;
          requiere_firma?:boolean;
          carpeta_drive:string;
          orden?:number;
          activo?:boolean;
        };
        Update:{
          nombre?:string;
          descripcion?:string|null;
          requiere_firma?:boolean;
          carpeta_drive?:string;
          orden?:number;
          activo?:boolean;
        };
        Relationships:[];
      },

      // ======================================================
      // EVENTOS
      // ======================================================

      eventos:{
        Row:{
          id:string;
          titulo:string;
          descripcion:string|null;
          tipo:string;
          fecha_inicio:string;
          fecha_fin:string|null;
          todo_el_dia:boolean;
          ubicacion:string|null;
          enlace_virtual:string|null;
          estado:string;
          prioridad:string;
          creador_id:string;
          asignado_a:string|null;
          participantes:Json;
          recordatorio_minutos:number;
          recordatorio_enviado:boolean;
          documento_id:string|null;
          created_at:string;
          updated_at:string;
        };
        Insert:{
          id?:string;
          titulo:string;
          descripcion?:string|null;
          tipo:string;
          fecha_inicio:string;
          fecha_fin?:string|null;
          todo_el_dia?:boolean;
          ubicacion?:string|null;
          enlace_virtual?:string|null;
          estado?:string;
          prioridad?:string;
          creador_id:string;
          asignado_a?:string|null;
          participantes?:Json;
          recordatorio_minutos?:number;
          recordatorio_enviado?:boolean;
          documento_id?:string|null;
          created_at?:string;
          updated_at?:string;
        };
        Update:{
          titulo?:string;
          descripcion?:string|null;
          tipo?:string;
          fecha_inicio?:string;
          fecha_fin?:string|null;
          todo_el_dia?:boolean;
          ubicacion?:string|null;
          enlace_virtual?:string|null;
          estado?:string;
          prioridad?:string;
          asignado_a?:string|null;
          participantes?:Json;
          recordatorio_minutos?:number;
          recordatorio_enviado?:boolean;
          documento_id?:string|null;
          updated_at?:string;
        };
        Relationships:[
          {
            foreignKeyName:"eventos_creador_id_fkey";
            columns:["creador_id"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          },
          {
            foreignKeyName:"eventos_asignado_a_fkey";
            columns:["asignado_a"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          },
          {
            foreignKeyName:"eventos_documento_id_fkey";
            columns:["documento_id"];
            referencedRelation:"documentos";
            referencedColumns:["id"];
          }
        ];
      },
            // ======================================================
      // AUDITORÍA
      // ======================================================

      auditoria:{
        Row:{
          id:string;
          usuario_id:string|null;
          accion:string;
          entidad:string|null;
          entidad_id:string|null;
          detalles:Json;
          ip_address:string|null;
          user_agent:string|null;
          created_at:string;
        };
        Insert:{
          id?:string;
          usuario_id?:string|null;
          accion:string;
          entidad?:string|null;
          entidad_id?:string|null;
          detalles?:Json;
          ip_address?:string|null;
          user_agent?:string|null;
          created_at?:string;
        };
        Update:{
          usuario_id?:string|null;
          accion?:string;
          entidad?:string|null;
          entidad_id?:string|null;
          detalles?:Json;
          ip_address?:string|null;
          user_agent?:string|null;
        };
        Relationships:[
          {
            foreignKeyName:"auditoria_usuario_id_fkey";
            columns:["usuario_id"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          }
        ];
      },

      // ======================================================
      // NOTIFICACIONES
      // ======================================================

      notificaciones:{
        Row:{
          id:string;
          usuario_id:string;
          tipo:string;
          titulo:string;
          mensaje:string|null;
          entidad_tipo:string|null;
          entidad_id:string|null;
          url:string|null;
          leida:boolean;
          fecha_lectura:string|null;
          created_at:string;
        };
        Insert:{
          id?:string;
          usuario_id:string;
          tipo:string;
          titulo:string;
          mensaje?:string|null;
          entidad_tipo?:string|null;
          entidad_id?:string|null;
          url?:string|null;
          leida?:boolean;
          fecha_lectura?:string|null;
          created_at?:string;
        };
        Update:{
          tipo?:string;
          titulo?:string;
          mensaje?:string|null;
          entidad_tipo?:string|null;
          entidad_id?:string|null;
          url?:string|null;
          leida?:boolean;
          fecha_lectura?:string|null;
        };
        Relationships:[
          {
            foreignKeyName:"notificaciones_usuario_id_fkey";
            columns:["usuario_id"];
            referencedRelation:"usuarios";
            referencedColumns:["id"];
          }
        ];
      }

    };

    Views:{};

    Functions:{};

    Enums:{};

    CompositeTypes:{};

  };

}