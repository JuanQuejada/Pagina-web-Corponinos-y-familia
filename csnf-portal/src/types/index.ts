// ============================================================
// TIPOS GLOBALES - CSNiños y Familia Portal
// ============================================================

export type UUID = string;

// --- ROLES ---
export type RolNombre = 'superadmin' | 'administrador' | 'alto_gobierno' | 'jefe_area' | 'empleado' | 'proveedor';

export interface Rol {
  id: UUID;
  nombre: RolNombre;
  descripcion: string;
  nivel: number;
  permisos: Record<string, string[]>;
  created_at: string;
}

// --- ÁREAS Y DEPARTAMENTOS ---
export interface Area {
  id: UUID;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
}

export interface Departamento {
  id: UUID;
  area_id: UUID;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

// --- USUARIOS ---
export interface Usuario {
  id: UUID;
  email: string;
  tipo_persona: 'natural' | 'juridica';
  tipo_usuario: 
  |'Representante Legal'
  |'Ejecutivo'
  |'Jefe Área o Departamento'
  |'Empleado'
  |'Proveedor';
  razon_social: string | null;
  nombres: string | null;
  apellidos: string | null;
  tipo_documento: 'CC' | 'CE' | 'Pasaporte' | 'Nit' |null;
  numero_documento: string | null;
  telefono: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  
  // Posición
  rol_id: UUID;
  area_id: UUID | null;
  departamento_id: UUID | null;
  cargo: string | null;
  fecha_vinculacion: string | null;
  tipo_contrato: string | null;
  jefe_directo_id: UUID | null;
  
  // Estados
  perfil_completo: boolean;
  password_cambiada: boolean;
  activo: boolean;
  ultimo_login: string | null;
  
  // Relaciones
  rol?: Rol;
  area?: Area;
  departamento?: Departamento;
  jefe_directo?: Usuario;
  
  created_at: string;
  updated_at: string;
}

export interface UsuarioPublico {
  id: UUID;
  nombres: string | null;
  apellidos: string | null;
  foto_url: string | null;
  cargo: string | null;
  area?: Area;
}

// --- TIPOS DE DOCUMENTO ---
export interface TipoDocumento {
  id: UUID;
  nombre: string;
  descripcion: string | null;
  requiere_firma: boolean;
  carpeta_drive: string;
  orden: number;
  activo: boolean;
}

// --- DOCUMENTOS ---
export type EstadoDocumento = 
  | 'borrador' 
  | 'pendiente_firma' 
  | 'en_revision' 
  | 'aprobado' 
  | 'rechazado' 
  | 'publicado';

export interface Firmante {
  usuario_id: UUID;
  orden: number;
  firmado: boolean;
  fecha_firma: string | null;
  usuario?: UsuarioPublico;
}

export interface VersionAnterior {
  drive_file_id: string;
  version: number;
  fecha: string;
}

export interface Documento {
  id: UUID;
  titulo: string;
  descripcion: string | null;
  tipo_documento_id: UUID;
  tipo_documento?: TipoDocumento;
  
  estado: EstadoDocumento;
  es_flujo_firma: boolean;
  es_publicidad: boolean;
  
  // Archivo
  nombre_archivo: string | null;
  extension: string | null;
  tamano_bytes: number | null;
  mime_type: string | null;
  
  // Google Drive
  drive_file_id: string | null;
  drive_folder_id: string | null;
  drive_url: string | null;
  drive_folder_path: string | null;
  
  // Versionado
  version: number;
  versiones_anteriores: VersionAnterior[];
  
  // Firmas
  firmas_requeridas: number;
  firmas_completadas: number;
  firmantes: Firmante[];
  
  // Visibilidad
  visible_para: string[];
  fecha_publicacion: string | null;
  
  // Relaciones
  autor_id: UUID;
  autor?: UsuarioPublico;
  area_id: UUID | null;
  area?: Area;
  
  aprobado_por: UUID | null;
  aprobador?: UsuarioPublico;
  fecha_aprobacion: string | null;
  
  created_at: string;
  updated_at: string;
}

// --- EVENTOS / AGENDA ---
export type TipoEvento = 'evento' | 'reunion' | 'tarea' | 'recordatorio';
export type EstadoEvento = 'pendiente' | 'en_curso' | 'completado' | 'cancelado';
export type PrioridadEvento = 'baja' | 'media' | 'alta' | 'urgente';

export interface Evento {
  id: UUID;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  
  fecha_inicio: string;
  fecha_fin: string | null;
  todo_el_dia: boolean;
  
  ubicacion: string | null;
  enlace_virtual: string | null;
  
  estado: EstadoEvento;
  prioridad: PrioridadEvento;
  
  creador_id: UUID;
  creador?: UsuarioPublico;
  asignado_a: UUID | null;
  asignado?: UsuarioPublico;
  participantes: UUID[];
  
  recordatorio_minutos: number;
  recordatorio_enviado: boolean;
  
  documento_id: UUID | null;
  documento?: Documento;
  
  created_at: string;
  updated_at: string;
}

// --- NOTIFICACIONES ---
export interface Notificacion {
  id: UUID;
  usuario_id: UUID;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  entidad_tipo: string | null;
  entidad_id: UUID | null;
  url: string | null;
  leida: boolean;
  fecha_lectura: string | null;
  created_at: string;
}

// --- AUDITORÍA ---
export interface Auditoria {
  id: UUID;
  usuario_id: UUID | null;
  usuario?: UsuarioPublico;
  accion: string;
  entidad: string | null;
  entidad_id: UUID | null;
  detalles: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// --- FORMULARIOS ---
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegistroUsuarioFormData {
  email: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  rol_id: UUID;
  area_id: UUID;
  departamento_id: UUID;
  cargo: string;
  fecha_vinculacion: string;
  tipo_contrato: string;
}

export interface CompletarPerfilFormData {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  fecha_vinculacion: string;
  cargo: string;
  foto?: File;
}

export interface CambioPasswordFormData {
  password_actual: string;
  password_nueva: string;
  password_confirmar: string;
}

export interface CrearDocumentoFormData {
  titulo: string;
  descripcion: string;
  tipo_documento_id: UUID;
  es_flujo_firma: boolean;
  es_publicidad: boolean;
  firmantes?: UUID[];
  archivo: File;
}

export interface CrearEventoFormData {
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  todo_el_dia: boolean;
  ubicacion: string;
  enlace_virtual: string;
  prioridad: PrioridadEvento;
  asignado_a: UUID | null;
  participantes: UUID[];
  recordatorio_minutos: number;
}

// --- RESPUESTAS API ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// --- DASHBOARD ---
export interface DashboardStats {
  total_documentos: number;
  documentos_pendientes_firma: number;
  eventos_semana: number;
  publicaciones_nuevas: number;
}

export interface DashboardData {
  stats: DashboardStats;
  pendientes: Documento[];
  eventos: Evento[];
  publicidad: Documento[];
  actividad: Auditoria[];
}
