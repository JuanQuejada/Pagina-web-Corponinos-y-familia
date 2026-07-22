// ============================================================
// TYPES - CSNiños y Familia Portal
// ============================================================

export type UUID = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key:string]:Json }
  | Json[];

// ============================================================
// RESPUESTAS GENERALES
// ============================================================

export interface ApiResponse<T=unknown>{
  success:boolean;
  data?:T;
  message?:string;
  error?:string;
}

export interface Paginacion<T>{
  data:T[];
  total:number;
  pagina:number;
  limite:number;
  totalPaginas:number;
}

// ============================================================
// ORGANIZACIÓN
// ============================================================

export interface Rol{
  id:UUID;
  nombre:string;
  descripcion?:string|null;
  nivel:number;
  permisos:Record<string,string[]>;
  created_at?:string;
}

export interface Area{
  id:UUID;
  nombre:string;
  descripcion?:string|null;
  orden:number;
  activa:boolean;
  created_at?:string;
  updated_at?:string;
}

export interface Departamento{
  id:UUID;
  area_id:UUID;
  nombre:string;
  descripcion?:string|null;
  activo:boolean;
  created_at?:string;
  area?:Area;
}

// ============================================================
// USUARIO
// ============================================================

export type TipoPersona=
  |"natural"
  |"juridica";

export type TipoUsuario=
  |"Representante Legal"
  |"Ejecutivo"
  |"Jefe Área o Departamento"
  |"Empleado"
  |"Proveedor";

export type TipoDocumento=
  |"CC"
  |"CE"
  |"Pasaporte"
  |"NIT";

export interface Usuario{

  id:UUID;
  email:string;
  password_hash?:string;
  tipo_persona:TipoPersona;
  tipo_usuario:TipoUsuario;
  razon_social?:string|null;
  nombres?:string|null;
  apellidos?:string|null;
  tipo_documento?:TipoDocumento|null;
  numero_documento?:string|null;
  telefono?:string|null;
  direccion?:string|null;
  fecha_nacimiento?:string|null;
  foto_url?:string|null;
  rol_id:UUID;
  area_id?:UUID|null;
  departamento_id?:UUID|null;
  cargo?:string|null;
  fecha_vinculacion?:string|null;
  tipo_contrato?:string|null;
  jefe_directo_id?:UUID|null;
  perfil_completo:boolean;
  password_cambiada:boolean;
  activo:boolean;
  ultimo_login?:string|null;
  created_at?:string;
  updated_at?:string;
  created_by?:UUID|null;
  rol?:Rol;
  area?:Area;
  departamento?:Departamento;
  jefe_directo?:Usuario|null;

}

// ============================================================
// SESIÓN
// ============================================================

export interface Sesion{

  usuario:Usuario;
  token:string;
  expira:string;

}

// ============================================================
// PERFIL PÚBLICO
// ============================================================

export interface PerfilUsuario{

  id:UUID;
  nombre:string;
  foto_url?:string|null;
  cargo?:string|null;
  tipo_usuario:TipoUsuario;
  area?:Area;
  departamento?:Departamento;

}
// ============================================================
// DOCUMENTOS
// ============================================================

export interface TipoDocumentoPortal{
  id:UUID;
  nombre:string;
  descripcion?:string|null;
  requiere_firma:boolean;
  carpeta_drive:string;
  orden:number;
  activo:boolean;
}

export interface Documento{
  id:UUID;
  titulo:string;
  descripcion?:string|null;
  tipo_documento_id:UUID;
  estado:string;
  es_flujo_firma:boolean;
  es_publicidad:boolean;
  nombre_archivo?:string|null;
  extension?:string|null;
  tamano_bytes?:number|null;
  mime_type?:string|null;
  drive_file_id?:string|null;
  drive_folder_id?:string|null;
  drive_url?:string|null;
  drive_folder_path?:string|null;
  version:number;
  versiones_anteriores?:Json;
  firmas_requeridas:number;
  firmas_completadas:number;
  firmantes?:Json;
  visible_para?:Json;
  fecha_publicacion?:string|null;
  autor_id:UUID;
  area_id?:UUID|null;
  aprobado_por?:UUID|null;
  fecha_aprobacion?:string|null;
  created_at?:string;
  updated_at?:string;
  autor?:Usuario;
  area?:Area;
  tipo_documento?:TipoDocumentoPortal;
}

// ============================================================
// GOOGLE DRIVE
// ============================================================

export interface ArchivoDrive{
  id:string;
  name:string;
  mimeType:string;
  size?:string;
  webViewLink?:string;
  webContentLink?:string;
  parents?:string[];
}

// ============================================================
// AGENDA
// ============================================================

export interface Evento{
  id:UUID;
  titulo:string;
  descripcion?:string|null;
  tipo:string;
  fecha_inicio:string;
  fecha_fin?:string|null;
  todo_el_dia:boolean;
  ubicacion?:string|null;
  enlace_virtual?:string|null;
  estado:string;
  prioridad:string;
  creador_id:UUID;
  asignado_a?:UUID|null;
  participantes?:Json;
  recordatorio_minutos:number;
  recordatorio_enviado:boolean;
  documento_id?:UUID|null;
  created_at?:string;
  updated_at?:string;
  creador?:Usuario;
  responsable?:Usuario;
  documento?:Documento;
}

// ============================================================
// AUDITORÍA
// ============================================================

export interface Auditoria{
  id:UUID;
  usuario_id?:UUID|null;
  accion:string;
  entidad?:string|null;
  entidad_id?:UUID|null;
  detalles?:Json;
  ip_address?:string|null;
  user_agent?:string|null;
  created_at?:string;
  usuario?:PerfilUsuario;
}

// ============================================================
// NOTIFICACIONES
// ============================================================

export interface Notificacion{
  id:UUID;
  usuario_id:UUID;
  tipo:string;
  titulo:string;
  mensaje?:string|null;
  entidad_tipo?:string|null;
  entidad_id?:UUID|null;
  url?:string|null;
  leida:boolean;
  fecha_lectura?:string|null;
  created_at?:string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface TarjetaDashboard{
  titulo:string;
  valor:number|string;
  icono:string;
  color:string;
  descripcion?:string;
}

export interface AccesoRapido{
  titulo:string;
  descripcion:string;
  icono:string;
  href:string;
  color:string;
  permiso?:string;
}

export interface ActividadReciente{
  id:UUID;
  titulo:string;
  descripcion:string;
  fecha:string;
  usuario?:PerfilUsuario;
  url?:string;
}

// ============================================================
// FORMULARIOS
// ============================================================

export interface OpcionSelect{
  value:string;
  label:string;
}

export interface ErrorFormulario{
  campo:string;
  mensaje:string;
}

// ============================================================
// FILTROS
// ============================================================

export interface FiltroBusqueda{
  texto?:string;
  estado?:string;
  area_id?:UUID;
  departamento_id?:UUID;
  fecha_inicio?:string;
  fecha_fin?:string;
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

export interface ConfiguracionUsuario{
  tema:"claro"|"oscuro"|"sistema";
  idioma:string;
  notificaciones:boolean;
}

// ============================================================
// FUTURA IMPLEMENTACIÓN
// (Preparado para múltiples perfiles)
// ============================================================

export interface PerfilAcceso{
  id:UUID;
  usuario_id:UUID;
  rol:Rol;
  area?:Area;
  departamento?:Departamento;
  cargo:string;
  principal:boolean;
}