export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string | null
          detalles: Json | null
          entidad: string | null
          entidad_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          detalles?: Json | null
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          detalles?: Json | null
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      auditoria_logs: {
        Row: {
          accion: string
          created_at: string
          descripcion: string
          id: string
          ip_origen: string | null
          modulo: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          descripcion: string
          id?: string
          ip_origen?: string | null
          modulo: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          descripcion?: string
          id?: string
          ip_origen?: string | null
          modulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          departamento_id: string
          descripcion: string | null
          editable: boolean
          es_firma_autorizada: boolean | null
          id: string
          nivel_jerarquico: string | null
          nivel_organizacional: number
          nombre: string
          orden: number
          puede_aprobar: boolean
          puede_iniciar_flujos: boolean
          reporta_a: string | null
          requiere_firma: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          departamento_id: string
          descripcion?: string | null
          editable?: boolean
          es_firma_autorizada?: boolean | null
          id?: string
          nivel_jerarquico?: string | null
          nivel_organizacional: number
          nombre: string
          orden: number
          puede_aprobar?: boolean
          puede_iniciar_flujos?: boolean
          reporta_a?: string | null
          requiere_firma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string
          descripcion?: string | null
          editable?: boolean
          es_firma_autorizada?: boolean | null
          id?: string
          nivel_jerarquico?: string | null
          nivel_organizacional?: number
          nombre?: string
          orden?: number
          puede_aprobar?: boolean
          puede_iniciar_flujos?: boolean
          reporta_a?: string | null
          requiere_firma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cargos_reporta"
            columns: ["reporta_a"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_general: {
        Row: {
          activo: boolean
          carpeta_raiz_drive: string | null
          carpeta_temporal_drive: string | null
          ciudad: string | null
          color_primario: string | null
          color_secundario: string | null
          correo_institucional: string | null
          created_at: string
          created_by: string | null
          departamento: string | null
          direccion: string | null
          favicon: string | null
          formato_fecha: string | null
          id: string
          idioma: string
          logo_blanco: string | null
          logo_principal: string | null
          nit: string | null
          nombre_entidad: string
          nombre_portal: string
          pais: string | null
          permitir_registro: boolean
          portal_en_mantenimiento: boolean
          sigla: string | null
          sitio_web: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
          version_portal: string
          zona_horaria: string
        }
        Insert: {
          activo?: boolean
          carpeta_raiz_drive?: string | null
          carpeta_temporal_drive?: string | null
          ciudad?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          correo_institucional?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: string | null
          direccion?: string | null
          favicon?: string | null
          formato_fecha?: string | null
          id?: string
          idioma?: string
          logo_blanco?: string | null
          logo_principal?: string | null
          nit?: string | null
          nombre_entidad: string
          nombre_portal: string
          pais?: string | null
          permitir_registro?: boolean
          portal_en_mantenimiento?: boolean
          sigla?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          version_portal?: string
          zona_horaria?: string
        }
        Update: {
          activo?: boolean
          carpeta_raiz_drive?: string | null
          carpeta_temporal_drive?: string | null
          ciudad?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          correo_institucional?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: string | null
          direccion?: string | null
          favicon?: string | null
          formato_fecha?: string | null
          id?: string
          idioma?: string
          logo_blanco?: string | null
          logo_principal?: string | null
          nit?: string | null
          nombre_entidad?: string
          nombre_portal?: string
          pais?: string | null
          permitir_registro?: boolean
          portal_en_mantenimiento?: boolean
          sigla?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          version_portal?: string
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_config_created"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_config_updated"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_sistema: {
        Row: {
          activo: boolean | null
          carpeta_raiz_drive: string | null
          carpeta_temporal_drive: string | null
          ciudad: string | null
          color_primario: string | null
          color_secundario: string | null
          correo_institucional: string | null
          created_at: string
          created_by: string | null
          departamento: string | null
          direccion: string | null
          favicon: string | null
          formato_fecha: string | null
          id: string
          idioma: string | null
          logo_blanco: string | null
          logo_principal: string | null
          nit: string | null
          nombre_entidad: string
          nombre_portal: string | null
          pais: string | null
          permitir_registro: boolean | null
          portal_en_mantenimiento: boolean | null
          sigla: string | null
          sitio_web: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
          version_portal: string | null
          zona_horaria: string | null
        }
        Insert: {
          activo?: boolean | null
          carpeta_raiz_drive?: string | null
          carpeta_temporal_drive?: string | null
          ciudad?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          correo_institucional?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: string | null
          direccion?: string | null
          favicon?: string | null
          formato_fecha?: string | null
          id?: string
          idioma?: string | null
          logo_blanco?: string | null
          logo_principal?: string | null
          nit?: string | null
          nombre_entidad: string
          nombre_portal?: string | null
          pais?: string | null
          permitir_registro?: boolean | null
          portal_en_mantenimiento?: boolean | null
          sigla?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          version_portal?: string | null
          zona_horaria?: string | null
        }
        Update: {
          activo?: boolean | null
          carpeta_raiz_drive?: string | null
          carpeta_temporal_drive?: string | null
          ciudad?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          correo_institucional?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: string | null
          direccion?: string | null
          favicon?: string | null
          formato_fecha?: string | null
          id?: string
          idioma?: string | null
          logo_blanco?: string | null
          logo_principal?: string | null
          nit?: string | null
          nombre_entidad?: string
          nombre_portal?: string | null
          pais?: string | null
          permitir_registro?: boolean | null
          portal_en_mantenimiento?: boolean | null
          sigla?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          version_portal?: string | null
          zona_horaria?: string | null
        }
        Relationships: []
      }
      departamentos: {
        Row: {
          activo: boolean | null
          area_id: string
          codigo: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          area_id: string
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          area_id?: string
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          codigo_flujo: string | null
          codigo_publicacion: string | null
          creador_id: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado_documento_id: string | null
          fecha_documento: string
          id: string
          observaciones: string | null
          palabras_clave: string | null
          requiere_flujo: boolean
          requiere_publicacion: boolean
          tipo_documento_id: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo_flujo?: string | null
          codigo_publicacion?: string | null
          creador_id: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado_documento_id?: string | null
          fecha_documento: string
          id?: string
          observaciones?: string | null
          palabras_clave?: string | null
          requiere_flujo?: boolean
          requiere_publicacion?: boolean
          tipo_documento_id: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo_flujo?: string | null
          codigo_publicacion?: string | null
          creador_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado_documento_id?: string | null
          fecha_documento?: string
          id?: string
          observaciones?: string | null
          palabras_clave?: string | null
          requiere_flujo?: boolean
          requiere_publicacion?: boolean
          tipo_documento_id?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_documento_creador"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documento_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documento_estado"
            columns: ["estado_documento_id"]
            isOneToOne: false
            referencedRelation: "estados_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documento_tipo"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "tipos_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documento_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_auditoria: {
        Row: {
          accion: string
          created_at: string
          descripcion: string | null
          documento_id: string
          fecha_evento: string
          flujo_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          usuario_id: string
          version_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          descripcion?: string | null
          documento_id: string
          fecha_evento?: string
          flujo_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          usuario_id: string
          version_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          descripcion?: string | null
          documento_id?: string
          fecha_evento?: string
          flujo_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          usuario_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_aud_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_aud_flujo"
            columns: ["flujo_id"]
            isOneToOne: false
            referencedRelation: "documentos_flujos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_aud_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_destinatarios: {
        Row: {
          acceso_toda_entidad: boolean
          area_id: string | null
          cargo_id: string | null
          created_at: string
          created_by: string | null
          departamento_id: string | null
          documento_id: string
          id: string
          rol_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acceso_toda_entidad?: boolean
          area_id?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          documento_id: string
          id?: string
          rol_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acceso_toda_entidad?: boolean
          area_id?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          documento_id?: string
          id?: string
          rol_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dest_area"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_cargo"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_created"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_departamento"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_rol"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dest_updated"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_firmantes: {
        Row: {
          created_at: string
          created_by: string | null
          estado_firmante_id: string
          fecha_aprobacion: string | null
          fecha_carga: string | null
          fecha_descarga: string | null
          fecha_habilitacion: string | null
          fecha_rechazo: string | null
          flujo_id: string
          id: string
          motivo_rechazo: string | null
          observaciones: string | null
          orden: number
          updated_at: string
          updated_by: string | null
          usuario_id: string
          version_documento_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado_firmante_id: string
          fecha_aprobacion?: string | null
          fecha_carga?: string | null
          fecha_descarga?: string | null
          fecha_habilitacion?: string | null
          fecha_rechazo?: string | null
          flujo_id: string
          id?: string
          motivo_rechazo?: string | null
          observaciones?: string | null
          orden: number
          updated_at?: string
          updated_by?: string | null
          usuario_id: string
          version_documento_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado_firmante_id?: string
          fecha_aprobacion?: string | null
          fecha_carga?: string | null
          fecha_descarga?: string | null
          fecha_habilitacion?: string | null
          fecha_rechazo?: string | null
          flujo_id?: string
          id?: string
          motivo_rechazo?: string | null
          observaciones?: string | null
          orden?: number
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string
          version_documento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_firmante_created"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_firmante_estado"
            columns: ["estado_firmante_id"]
            isOneToOne: false
            referencedRelation: "estados_firmante_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_firmante_flujo"
            columns: ["flujo_id"]
            isOneToOne: false
            referencedRelation: "documentos_flujos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_firmante_updated"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_firmante_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_flujos: {
        Row: {
          cancelado_por: string | null
          consecutivo_repositorio_privado: string | null
          created_at: string
          created_by: string | null
          destino_final: string | null
          documento_id: string
          estado: string | null
          estado_flujo_id: string
          fecha_cancelacion: string | null
          fecha_fin: string | null
          fecha_inicio: string
          fecha_limite: string | null
          id: string
          iniciado_por: string
          motivo_rechazo: string | null
          numero_flujo: number
          observaciones: string | null
          proposito: string | null
          reiniciado_desde: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancelado_por?: string | null
          consecutivo_repositorio_privado?: string | null
          created_at?: string
          created_by?: string | null
          destino_final?: string | null
          documento_id: string
          estado?: string | null
          estado_flujo_id: string
          fecha_cancelacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          fecha_limite?: string | null
          id?: string
          iniciado_por: string
          motivo_rechazo?: string | null
          numero_flujo?: number
          observaciones?: string | null
          proposito?: string | null
          reiniciado_desde?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancelado_por?: string | null
          consecutivo_repositorio_privado?: string | null
          created_at?: string
          created_by?: string | null
          destino_final?: string | null
          documento_id?: string
          estado?: string | null
          estado_flujo_id?: string
          fecha_cancelacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          fecha_limite?: string | null
          id?: string
          iniciado_por?: string
          motivo_rechazo?: string | null
          numero_flujo?: number
          observaciones?: string | null
          proposito?: string | null
          reiniciado_desde?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_flujo_cancelado"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_created"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_estado"
            columns: ["estado_flujo_id"]
            isOneToOne: false
            referencedRelation: "estados_flujo_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_reinicio"
            columns: ["reiniciado_desde"]
            isOneToOne: false
            referencedRelation: "documentos_flujos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_updated"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flujo_usuario"
            columns: ["iniciado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_flujos_historial: {
        Row: {
          accion: string | null
          created_at: string
          documento_flujo_id: string | null
          id: string
          observacion: string | null
          usuario_id: string | null
        }
        Insert: {
          accion?: string | null
          created_at?: string
          documento_flujo_id?: string | null
          id?: string
          observacion?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string | null
          created_at?: string
          documento_flujo_id?: string | null
          id?: string
          observacion?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_flujos_historial_documento_flujo_id_fkey"
            columns: ["documento_flujo_id"]
            isOneToOne: false
            referencedRelation: "documentos_flujos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_flujos_historial_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_publicaciones: {
        Row: {
          codigo_publicacion: string
          created_at: string
          created_by: string | null
          documento_id: string
          fecha_fin: string | null
          fecha_inicio: string
          fecha_publicacion: string | null
          fecha_retiro: string | null
          id: string
          motivo_retiro: string | null
          observaciones: string | null
          publicada: boolean
          publicada_por: string
          retirada_por: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo_publicacion: string
          created_at?: string
          created_by?: string | null
          documento_id: string
          fecha_fin?: string | null
          fecha_inicio: string
          fecha_publicacion?: string | null
          fecha_retiro?: string | null
          id?: string
          motivo_retiro?: string | null
          observaciones?: string | null
          publicada?: boolean
          publicada_por: string
          retirada_por?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo_publicacion?: string
          created_at?: string
          created_by?: string | null
          documento_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          fecha_publicacion?: string | null
          fecha_retiro?: string | null
          id?: string
          motivo_retiro?: string | null
          observaciones?: string | null
          publicada?: boolean
          publicada_por?: string
          retirada_por?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_publicacion_created"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_publicacion_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_publicacion_retiro"
            columns: ["retirada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_publicacion_updated"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_publicacion_usuario"
            columns: ["publicada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_versiones: {
        Row: {
          created_at: string
          documento_id: string
          drive_url: string
          es_version_actual: boolean
          id: string
          mime_type: string | null
          nombre_archivo: string
          numero_version: number
          tamano_bytes: number | null
          usuario_carga_id: string | null
        }
        Insert: {
          created_at?: string
          documento_id: string
          drive_url: string
          es_version_actual?: boolean
          id?: string
          mime_type?: string | null
          nombre_archivo: string
          numero_version?: number
          tamano_bytes?: number | null
          usuario_carga_id?: string | null
        }
        Update: {
          created_at?: string
          documento_id?: string
          drive_url?: string
          es_version_actual?: boolean
          id?: string
          mime_type?: string | null
          nombre_archivo?: string
          numero_version?: number
          tamano_bytes?: number | null
          usuario_carga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_versiones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_versiones_usuario_carga_id_fkey"
            columns: ["usuario_carga_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_documento: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      estados_firmante_documento: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      estados_flujo_documento: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      estados_usuario: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      estados_version_documento: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      eventos: {
        Row: {
          asignado_a: string | null
          creador_id: string
          created_at: string | null
          descripcion: string | null
          documento_id: string | null
          enlace_virtual: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          participantes: Json | null
          prioridad: string | null
          recordatorio_enviado: boolean | null
          recordatorio_minutos: number | null
          tipo: string
          titulo: string
          todo_el_dia: boolean | null
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          creador_id: string
          created_at?: string | null
          descripcion?: string | null
          documento_id?: string | null
          enlace_virtual?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          participantes?: Json | null
          prioridad?: string | null
          recordatorio_enviado?: boolean | null
          recordatorio_minutos?: number | null
          tipo: string
          titulo: string
          todo_el_dia?: boolean | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          creador_id?: string
          created_at?: string | null
          descripcion?: string | null
          documento_id?: string | null
          enlace_virtual?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          participantes?: Json | null
          prioridad?: string | null
          recordatorio_enviado?: boolean | null
          recordatorio_minutos?: number | null
          tipo?: string
          titulo?: string
          todo_el_dia?: boolean | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kanban_columnas: {
        Row: {
          created_at: string
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      kanban_tareas: {
        Row: {
          asignado_id: string | null
          columna_id: string | null
          creador_id: string | null
          created_at: string
          descripcion: string | null
          fecha_vencimiento: string | null
          id: string
          prioridad: string | null
          titulo: string
        }
        Insert: {
          asignado_id?: string | null
          columna_id?: string | null
          creador_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: string | null
          titulo: string
        }
        Update: {
          asignado_id?: string | null
          columna_id?: string | null
          creador_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_tareas_asignado_id_fkey"
            columns: ["asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tareas_columna_id_fkey"
            columns: ["columna_id"]
            isOneToOne: false
            referencedRelation: "kanban_columnas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tareas_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          icono: string | null
          id: string
          nombre: string
          orden: number
          ruta: string | null
          updated_at: string
          visible_menu: boolean
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre: string
          orden: number
          ruta?: string | null
          updated_at?: string
          visible_menu?: boolean
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
          ruta?: string | null
          updated_at?: string
          visible_menu?: boolean
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          created_at: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          fecha_lectura: string | null
          id: string
          leida: boolean | null
          mensaje: string | null
          tipo: string
          titulo: string
          url: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_lectura?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          tipo: string
          titulo: string
          url?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_lectura?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          tipo?: string
          titulo?: string
          url?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      notificaciones_flujos: {
        Row: {
          created_at: string
          documento_flujo_id: string | null
          id: string
          leida: boolean | null
          mensaje: string | null
          titulo: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          documento_flujo_id?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          titulo?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          documento_flujo_id?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          titulo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_flujos_documento_flujo_id_fkey"
            columns: ["documento_flujo_id"]
            isOneToOne: false
            referencedRelation: "documentos_flujos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_flujos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones_sistema: {
        Row: {
          created_at: string
          id: string
          leida: boolean | null
          mensaje: string
          modulo_origen: string
          referencia_id: string | null
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean | null
          mensaje: string
          modulo_origen: string
          referencia_id?: string | null
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean | null
          mensaje?: string
          modulo_origen?: string
          referencia_id?: string | null
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos: {
        Row: {
          accion: string
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          modulo: string
          modulo_id: string
          updated_at: string
        }
        Insert: {
          accion: string
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          modulo: string
          modulo_id: string
          updated_at?: string
        }
        Update: {
          accion?: string
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          modulo?: string
          modulo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_permisos_modulo"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          descripcion: string | null
          editable: boolean | null
          id: string
          nivel: number
          nombre: string
          orden: number | null
          permisos: Json | null
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          editable?: boolean | null
          id?: string
          nivel: number
          nombre: string
          orden?: number | null
          permisos?: Json | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          editable?: boolean | null
          id?: string
          nivel?: number
          nombre?: string
          orden?: number | null
          permisos?: Json | null
        }
        Relationships: []
      }
      tipos_documento: {
        Row: {
          activo: boolean | null
          carpeta_drive: string
          categoria: string | null
          codigo: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number | null
          requiere_firma: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          carpeta_drive: string
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden?: number | null
          requiere_firma?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          carpeta_drive?: string
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number | null
          requiere_firma?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tipos_identificacion: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          tipo_persona_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          tipo_persona_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          tipo_persona_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tipos_identificacion_tipo_persona"
            columns: ["tipo_persona_id"]
            isOneToOne: false
            referencedRelation: "tipos_persona"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_persona: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          editable: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre: string
          orden: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          editable?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apellidos: string | null
          auth_user_id: string | null
          cargo_id: string | null
          clave_repositorio: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          estado_usuario_id: string
          fecha_ingreso: string | null
          fecha_retiro: string | null
          foto_url: string | null
          id: string
          nombres: string | null
          numero_identificacion: string
          puede_iniciar_flujos: boolean | null
          razon_social: string | null
          telefono: string | null
          tipo_identificacion_id: string
          tipo_persona_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apellidos?: string | null
          auth_user_id?: string | null
          cargo_id?: string | null
          clave_repositorio?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          estado_usuario_id: string
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          foto_url?: string | null
          id: string
          nombres?: string | null
          numero_identificacion: string
          puede_iniciar_flujos?: boolean | null
          razon_social?: string | null
          telefono?: string | null
          tipo_identificacion_id: string
          tipo_persona_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apellidos?: string | null
          auth_user_id?: string | null
          cargo_id?: string | null
          clave_repositorio?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          estado_usuario_id?: string
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          foto_url?: string | null
          id?: string
          nombres?: string | null
          numero_identificacion?: string
          puede_iniciar_flujos?: boolean | null
          razon_social?: string | null
          telefono?: string | null
          tipo_identificacion_id?: string
          tipo_persona_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_usuario_estado"
            columns: ["estado_usuario_id"]
            isOneToOne: false
            referencedRelation: "estados_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_usuario_tipo_identificacion"
            columns: ["tipo_identificacion_id"]
            isOneToOne: false
            referencedRelation: "tipos_identificacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_usuario_tipo_persona"
            columns: ["tipo_persona_id"]
            isOneToOne: false
            referencedRelation: "tipos_persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_asignaciones: {
        Row: {
          activo: boolean
          cargo_id: string
          created_at: string
          created_by: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          perfil_predeterminado: boolean
          rol_id: string
          updated_at: string
          updated_by: string | null
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          cargo_id: string
          created_at?: string
          created_by?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          perfil_predeterminado?: boolean
          rol_id: string
          updated_at?: string
          updated_by?: string | null
          usuario_id: string
        }
        Update: {
          activo?: boolean
          cargo_id?: string
          created_at?: string
          created_by?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          perfil_predeterminado?: boolean
          rol_id?: string
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_asignacion_cargo"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asignacion_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asignacion_rol"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asignacion_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asignacion_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_configuracion: {
        Row: {
          consentimiento_datos: boolean | null
          formato_fecha: string | null
          formato_hora: string | null
          frecuencia_recordatorios: string | null
          idioma: string | null
          notif_aprobaciones: boolean | null
          notif_documentos: boolean | null
          notif_eventos: boolean | null
          notif_tareas: boolean | null
          tema: string | null
          updated_at: string | null
          usuario_id: string
          zona_horaria: string | null
        }
        Insert: {
          consentimiento_datos?: boolean | null
          formato_fecha?: string | null
          formato_hora?: string | null
          frecuencia_recordatorios?: string | null
          idioma?: string | null
          notif_aprobaciones?: boolean | null
          notif_documentos?: boolean | null
          notif_eventos?: boolean | null
          notif_tareas?: boolean | null
          tema?: string | null
          updated_at?: string | null
          usuario_id: string
          zona_horaria?: string | null
        }
        Update: {
          consentimiento_datos?: boolean | null
          formato_fecha?: string | null
          formato_hora?: string | null
          frecuencia_recordatorios?: string | null
          idioma?: string | null
          notif_aprobaciones?: boolean | null
          notif_documentos?: boolean | null
          notif_eventos?: boolean | null
          notif_tareas?: boolean | null
          tema?: string | null
          updated_at?: string | null
          usuario_id?: string
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_configuracion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
