export interface Database {
    public: {
      Tables: {
        usuarios: {
          Row: {
            id: string;
            email: string;
            password_hash: string;
            nombres: string | null;
            apellidos: string | null;
            tipo_documento: string | null;
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
            nombres?: string | null;
            apellidos?: string | null;
            // ... (puedes completar según necesites)
          };
          Update: {
            // ... campos opcionales para actualizar
          };
        };
        documentos: {
          Row: {
            id: string;
            titulo: string;
            descripcion: string | null;
            tipo_documento_id: string;
            estado: string;
            es_flujo_firma: boolean;
            es_publicidad: boolean;
            nombre_archivo: string | null;
            extension: string | null;
            tamano_bytes: number | null;
            mime_type: string | null;
            drive_file_id: string | null;
            drive_folder_id: string | null;
            drive_url: string | null;
            drive_folder_path: string | null;
            version: number;
            versiones_anteriores: any[];
            firmas_requeridas: number;
            firmas_completadas: number;
            firmantes: any[];
            visible_para: any[];
            fecha_publicacion: string | null;
            autor_id: string;
            area_id: string | null;
            aprobado_por: string | null;
            fecha_aprobacion: string | null;
            created_at: string;
            updated_at: string;
          };
        };
        eventos: {
          Row: {
            id: string;
            titulo: string;
            descripcion: string | null;
            tipo: string;
            fecha_inicio: string;
            fecha_fin: string | null;
            todo_el_dia: boolean;
            ubicacion: string | null;
            enlace_virtual: string | null;
            estado: string;
            prioridad: string;
            creador_id: string;
            asignado_a: string | null;
            participantes: any[];
            recordatorio_minutos: number;
            recordatorio_enviado: boolean;
            documento_id: string | null;
            created_at: string;
            updated_at: string;
          };
        };
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
        };
        departamentos: {
          Row: {
            id: string;
            area_id: string;
            nombre: string;
            descripcion: string | null;
            activo: boolean;
            created_at: string;
          };
        };
        roles: {
          Row: {
            id: string;
            nombre: string;
            descripcion: string | null;
            nivel: number;
            permisos: any;
            created_at: string;
          };
        };
        auditoria: {
          Row: {
            id: string;
            usuario_id: string | null;
            accion: string;
            entidad: string | null;
            entidad_id: string | null;
            detalles: any;
            ip_address: string | null;
            user_agent: string | null;
            created_at: string;
          };
        };
        notificaciones: {
          Row: {
            id: string;
            usuario_id: string;
            tipo: string;
            titulo: string;
            mensaje: string | null;
            entidad_tipo: string | null;
            entidad_id: string | null;
            url: string | null;
            leida: boolean;
            fecha_lectura: string | null;
            created_at: string;
          };
        };
        tipos_documento: {
          Row: {
            id: string;
            nombre: string;
            descripcion: string | null;
            requiere_firma: boolean;
            carpeta_drive: string;
            orden: number;
            activo: boolean;
          };
        };
      };
    };
  }
