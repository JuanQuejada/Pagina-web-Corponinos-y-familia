import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVICE;
const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const out = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function auth(request: NextRequest) {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const token = h.slice(7);
  const client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

const priority = (v: unknown) => ["alta", "media", "baja"].includes(String(v).toLowerCase()) ? String(v).toLowerCase() : "media";
const category = (v: unknown) => {
  const t = String(v ?? "").toUpperCase();
  if (t.includes("PENDIENTE") || t.includes("APROBACION") || t.includes("TAREA") || t.includes("VENC")) return "pendiente";
  if (t.includes("PROXIM") || t.includes("RECORDATORIO") || t.includes("ALERTA")) return "proxima";
  if (t.includes("FINALIZ") || t.includes("COMPLET")) return "completada";
  return "informativa";
};

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user) return out({ success: false, error: "No autenticado." }, 401);

    const { data: profile, error: profileError } = await db.from("usuarios")
      .select("id,auth_user_id,nombres,apellidos,razon_social,email,foto_url,cargo_id,cargos:cargo_id(id,nombre,codigo)")
      .eq("auth_user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return out({ success: false, error: "Perfil de usuario no encontrado." }, 404);

    const uid = profile.id;
    const [rolesR, configR, docsR, destR, firmantesR, flowsR, tasksR, eventsR, nR, nsR, nfR, adsR, repoR, auditR] = await Promise.all([
      db.from("usuarios_asignaciones").select("rol_id,perfil_predeterminado,roles:rol_id(id,nombre,codigo)").eq("usuario_id", uid).eq("activo", true),
      db.from("configuracion_sistema").select("nombre_entidad,sigla,nombre_portal,version_portal,zona_horaria,formato_fecha").eq("activo", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("documentos").select("id,titulo,codigo_publicacion,fecha_documento,publicado_en,tipo_documento_id,visibilidad,tipos_documento:tipo_documento_id(id,nombre,codigo)").eq("visibilidad", "publico").order("publicado_en", { ascending: false, nullsFirst: false }).limit(50),
      db.from("documentos_destinatarios").select("documento_id,rol_id,acceso_toda_entidad").limit(5000),
      db.from("documentos_firmantes").select("flujo_id,estado_firmante_id,estados_firmante_documento:estado_firmante_id(codigo,nombre)").eq("usuario_id", uid),
      db.from("documentos_flujos").select("id,numero_flujo,estado,estado_flujo_id,iniciado_por,fecha_inicio,fecha_limite,titulo,descripcion,destino_final,tipo_documento_id,estados_flujo_documento:estado_flujo_id(codigo,nombre)").order("created_at", { ascending: false }).limit(100),
      db.from("kanban_tareas").select("id,titulo,descripcion,columna_id,asignado_id,creador_id,prioridad,fecha_vencimiento,created_at,kanban_columnas:columna_id(id,nombre,orden)").or(`asignado_id.eq.${uid},creador_id.eq.${uid}`).order("fecha_vencimiento", { ascending: true, nullsFirst: false }).limit(30),
      db.from("eventos").select("id,titulo,descripcion,tipo,fecha_inicio,fecha_fin,todo_el_dia,ubicacion,enlace_virtual,estado,prioridad,creador_id,asignado_a,participantes,recordatorio_minutos,documento_id").or(`creador_id.eq.${uid},asignado_a.eq.${uid}`).gte("fecha_inicio", new Date(new Date().setHours(0,0,0,0)).toISOString()).order("fecha_inicio", { ascending: true }).limit(30),
      db.from("notificaciones").select("id,tipo,titulo,mensaje,entidad_tipo,entidad_id,url,leida,fecha_lectura,created_at").eq("usuario_id", uid).order("created_at", { ascending: false }).limit(12),
      db.from("notificaciones_sistema").select("id,modulo_origen,titulo,mensaje,referencia_id,leida,created_at").eq("usuario_id", uid).order("created_at", { ascending: false }).limit(12),
      db.from("notificaciones_flujos").select("id,documento_flujo_id,titulo,mensaje,leida,created_at").eq("usuario_id", uid).order("created_at", { ascending: false }).limit(12),
      db.from("anuncios").select("id,titulo,contenido,activo,autor_id,created_at").eq("activo", true).order("created_at", { ascending: false }).limit(6),
      db.from("repositorios_documentos").select("id,repositorio_id,documento_id,repositorios:repositorio_id(id,nombre,activo),documentos:documento_id(id,titulo,codigo_publicacion,visibilidad,publicado_en)").order("created_at", { ascending: false }).limit(100),
      db.from("auditoria_logs").select("id,accion,modulo,descripcion,created_at").eq("usuario_id", uid).order("created_at", { ascending: false }).limit(8),
    ]);
    const err = [rolesR,configR,docsR,destR,firmantesR,flowsR,tasksR,eventsR,nR,nsR,nfR,adsR,repoR,auditR].find(x=>x.error)?.error; if(err) throw err;

    const roles = (rolesR.data ?? []).map((x:any)=>x.roles).filter(Boolean);
    const roleIds = roles.map((r:any)=>r.id).filter(Boolean);
    const destinationRows = destR.data ?? [];
    const allowedDocumentIds = new Set(destinationRows.filter((x:any)=>x.acceso_toda_entidad || (x.rol_id && roleIds.includes(x.rol_id))).map((x:any)=>x.documento_id));
    const visibleDocuments = (docsR.data ?? []).filter((d:any)=>destinationRows.length === 0 || allowedDocumentIds.has(d.id)).slice(0,8);
    const isAdmin = roles.some((r:any)=>["ADMIN","ADMINISTRADOR","SUPERADMIN","SUPER_ADMIN"].includes(String(r.codigo??r.nombre).toUpperCase()));
    const flows = flowsR.data ?? [], tasks = tasksR.data ?? [], events = eventsR.data ?? [];
    const pendingFirmanteIds = new Set((firmantesR.data ?? []).filter((x:any)=>["PENDIENTE","HABILITADO","DOCUMENTO_CARGADO"].includes(String(x.estados_firmante_documento?.codigo??"").toUpperCase())).map((x:any)=>x.flujo_id));
    const pendingFlows = flows.filter((f:any)=>pendingFirmanteIds.has(f.id) || ["PENDIENTE","EN_CURSO"].includes(String(f.estados_flujo_documento?.codigo??f.estado).toUpperCase()));
    const pendingTasks = tasks.filter((t:any)=>!["completado","completada","finalizado","finalizada"].includes(String(t.kanban_columnas?.nombre??"").toLowerCase()));
    const notifications = [
      ...(nR.data??[]).map((n:any)=>({...n,modulo:n.entidad_tipo==="documentos_flujos"?"flujos":"sistema"})),
      ...(nsR.data??[]).map((n:any)=>({id:n.id,tipo:n.modulo_origen,titulo:n.titulo,mensaje:n.mensaje,entidad_tipo:n.modulo_origen,entidad_id:n.referencia_id,url:null,leida:n.leida??false,created_at:n.created_at,modulo:String(n.modulo_origen??"sistema").toLowerCase()})),
      ...(nfR.data??[]).map((n:any)=>({id:n.id,tipo:"FLUJO",titulo:n.titulo,mensaje:n.mensaje,entidad_tipo:"documentos_flujos",entidad_id:n.documento_flujo_id,url:"/principal/flujo-aprobaciones",leida:n.leida??false,created_at:n.created_at,modulo:"flujos"})),
    ].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime()).slice(0,12).map(n=>({...n,categoria:category(n.tipo)}));
    const name=[profile.nombres,profile.apellidos].filter(Boolean).join(" ")||profile.razon_social||"Usuario";
    const hour=new Date().getHours(); const greeting=hour<12?"Buenos días":hour<18?"Buenas tardes":"Buenas noches";
    const today=new Date().toISOString().slice(0,10); const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
    const upcomingToday=[...pendingTasks.filter((x:any)=>x.fecha_vencimiento===today).map((x:any)=>({tipo:"tarea",id:x.id,titulo:x.titulo,hora:null,prioridad:priority(x.prioridad),url:"/principal/kanban"})),...events.filter((x:any)=>String(x.fecha_inicio).slice(0,10)===today).map((x:any)=>({tipo:"evento",id:x.id,titulo:x.titulo,hora:new Date(x.fecha_inicio).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),prioridad:priority(x.prioridad),url:"/principal/agenda"}))];
    const upcomingTomorrow=events.filter((x:any)=>String(x.fecha_inicio).slice(0,10)===tomorrow).map((x:any)=>({tipo:"evento",id:x.id,titulo:x.titulo,hora:new Date(x.fecha_inicio).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),prioridad:priority(x.prioridad),url:"/principal/agenda"}));
    const activity=[...(auditR.data??[]).map((x:any)=>({id:x.id,modulo:x.modulo??"Sistema",tipo:x.accion,titulo:x.accion,descripcion:x.descripcion,fecha:x.created_at,url:null})),...notifications.slice(0,5).map(n=>({id:`n-${n.id}`,modulo:n.modulo,tipo:n.tipo,titulo:n.titulo,descripcion:n.mensaje,fecha:n.created_at,url:n.url}))].sort((a,b)=>new Date(b.fecha??0).getTime()-new Date(a.fecha??0).getTime()).slice(0,10);
    const repoDocs=(repoR.data??[]).filter((x:any)=>x.repositorios?.activo!==false&&x.documentos);
    const data={
      usuario:{id:uid,auth_user_id:profile.auth_user_id,nombre:name,email:profile.email??user.email??null,foto_url:profile.foto_url??null,cargo:profile.cargos??null,roles},
      saludo:{texto:greeting,mensaje:notifications.filter(n=>!n.leida).length?`Tienes ${notifications.filter(n=>!n.leida).length} asunto${notifications.filter(n=>!n.leida).length===1?"":"s"} pendiente${notifications.filter(n=>!n.leida).length===1?"":"s"} de atención.`:"No tienes notificaciones pendientes.",fecha:today,hora:new Date().toISOString()},
      resumen:{notificaciones_pendientes:notifications.filter(n=>!n.leida).length,flujos_pendientes:pendingFlows.length,tareas_pendientes:pendingTasks.length,eventos_proximos:events.length,documentos_nuevos:visibleDocuments.length,documentos_repositorio:repoDocs.length},
      pendientes:{flujos:pendingFlows.slice(0,8).map((f:any)=>({id:f.id,titulo:f.titulo??"Flujo de aprobación",numero_flujo:f.numero_flujo,estado:f.estados_flujo_documento?.codigo??f.estado,fecha_limite:f.fecha_limite,url:"/principal/flujo-aprobaciones"})),tareas:pendingTasks.slice(0,8).map((t:any)=>({id:t.id,titulo:t.titulo,descripcion:t.descripcion,prioridad:priority(t.prioridad),fecha_vencimiento:t.fecha_vencimiento,columna:t.kanban_columnas??null,url:"/principal/kanban"})),eventos:events.slice(0,8).map((e:any)=>({id:e.id,titulo:e.titulo,tipo:e.tipo,fecha_inicio:e.fecha_inicio,fecha_fin:e.fecha_fin,ubicacion:e.ubicacion,prioridad:priority(e.prioridad),url:"/principal/agenda"}))},
      proximos:{hoy:upcomingToday,manana:upcomingTomorrow,esta_semana:events.slice(0,8).map((e:any)=>({tipo:"evento",id:e.id,titulo:e.titulo,hora:new Date(e.fecha_inicio).toLocaleDateString("es-CO"),prioridad:priority(e.prioridad),url:"/principal/agenda"}))},
      documentos:{total_visibles:visibleDocuments.length,publicados_recientemente:visibleDocuments.map((d:any)=>({id:d.id,titulo:d.titulo,codigo_publicacion:d.codigo_publicacion,tipo_documento:d.tipos_documento??null,fecha_publicacion:d.publicado_en,url:"/principal/documentos"}))},
      repositorio:{total_accesibles:repoDocs.length,documentos_recientes:repoDocs.slice(0,8).map((x:any)=>({id:x.documentos.id,titulo:x.documentos.titulo,codigo_publicacion:x.documentos.codigo_publicacion,fecha_publicacion:x.documentos.publicado_en,repositorio:x.repositorios?.nombre??null,url:"/principal/repositorios"}))},
      notificaciones:{no_leidas:notifications.filter(n=>!n.leida).length,recientes:notifications},actividad_reciente:activity,
      anuncios:(adsR.data??[]),
      accesos_rapidos:[{codigo:"NUEVO_DOCUMENTO",nombre:"Nuevo documento",descripcion:"Crear un documento para publicación manual.",icono:"FilePlus",url:"/principal/documentos",visible:true},{codigo:"NUEVO_FLUJO",nombre:"Iniciar flujo",descripcion:"Crear un nuevo flujo de aprobación.",icono:"FileSignature",url:"/principal/flujo-aprobaciones",visible:true},{codigo:"NUEVA_TAREA",nombre:"Nueva tarea",descripcion:"Crear una tarea en Kanban.",icono:"ClipboardPlus",url:"/principal/kanban",visible:true},{codigo:"NUEVO_EVENTO",nombre:"Nueva actividad",descripcion:"Crear una actividad en la agenda institucional.",icono:"CalendarPlus",url:"/principal/agenda",visible:true},{codigo:"NOTIFICACIONES",nombre:"Notificaciones",descripcion:"Consultar notificaciones y alertas.",icono:"Bell",url:"/principal/notificaciones",visible:true}],
      administracion:{visible:isAdmin},metadatos:{generado_en:new Date().toISOString(),zona_horaria:configR.data?.zona_horaria??"America/Bogota",version:"2.0",nombre_entidad:configR.data?.nombre_entidad??"Portal Documental",sigla:configR.data?.sigla??null,nombre_portal:configR.data?.nombre_portal??"Portal de Gestión Documental"}
    };
    return out({success:true,data});
  } catch(e:any) { console.error("/api/dashboard",e); return out({success:false,error:e?.message??"Error interno del Dashboard."},500); }
}
