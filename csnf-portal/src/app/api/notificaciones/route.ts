import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

type Item = {
  id: string; source_id: string; source: string; usuario_id: string;
  modulo_origen: string; tipo: string; titulo: string; mensaje: string;
  entidad_tipo: string | null; entidad_id: string | null; url: string | null;
  leida: boolean; created_at: string; fecha_lectura?: string | null;
  prioridad: "alta" | "media" | "baja"; categoria: "pendiente" | "proxima" | "informativa" | "completada";
  fecha_referencia: string | null;
};

function token(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

async function currentUser(req: NextRequest) {
  const t = token(req);
  if (!t) return null;
  const { data: auth, error } = await db.auth.getUser(t);
  if (error || !auth.user) return null;
  const { data } = await db.from("usuarios").select("id,auth_user_id,nombres,apellidos,email").eq("auth_user_id", auth.user.id).maybeSingle();
  return data || null;
}

function moduleName(value: string, system = false) {
  const x = value.toLowerCase();
  if (x.includes("flujo") || x.includes("aprobacion")) return "flujos";
  if (x.includes("kanban") || x.includes("tarea")) return "kanban";
  if (x.includes("agenda") || x.includes("evento")) return "agenda";
  if (x.includes("document")) return "documentos";
  return system ? "sistema" : "sistema";
}

function priority(type: string, message: string) {
  const x = `${type} ${message}`.toLowerCase();
  if (/rechaz|vencid|urgente|bloque/.test(x)) return "alta" as const;
  if (/pendiente|asignad|firma|proxim/.test(x)) return "media" as const;
  return "baja" as const;
}

function category(type: string, read: boolean, reference?: string | null) {
  const x = type.toLowerCase();
  if (/pendiente|asignad|venc/.test(x)) return "pendiente" as const;
  if (reference && new Date(reference).getTime() >= Date.now()) return "proxima" as const;
  if (read || /complet|finaliz/.test(x)) return "completada" as const;
  return "informativa" as const;
}

function generic(r: any, source: string): Item {
  const type = String(r.tipo || "INFO");
  const msg = String(r.mensaje || "");
  return {
    id: `${source}:${r.id}`, source_id: r.id, source, usuario_id: r.usuario_id,
    modulo_origen: moduleName(`${r.tipo || ""} ${r.entidad_tipo || ""}`), tipo: type,
    titulo: String(r.titulo || "Notificación"), mensaje: msg,
    entidad_tipo: r.entidad_tipo ?? null, entidad_id: r.entidad_id ?? null,
    url: r.url ?? null, leida: Boolean(r.leida), created_at: r.created_at,
    fecha_lectura: r.fecha_lectura ?? null, prioridad: priority(type, msg),
    categoria: category(type, Boolean(r.leida)), fecha_referencia: null,
  };
}

function system(r: any): Item {
  const type = String(r.modulo_origen || "SISTEMA");
  const msg = String(r.mensaje || "");
  return {
    id: `sistema:${r.id}`, source_id: r.id, source: "notificaciones_sistema", usuario_id: r.usuario_id,
    modulo_origen: moduleName(type, true), tipo: type, titulo: String(r.titulo || "Notificación"), mensaje: msg,
    entidad_tipo: "notificaciones_sistema", entidad_id: r.referencia_id ?? null, url: r.url ?? null,
    leida: Boolean(r.leida), created_at: r.created_at, fecha_lectura: r.fecha_lectura ?? null,
    prioridad: priority(type, msg), categoria: category(type, Boolean(r.leida)), fecha_referencia: null,
  };
}

function flow(r: any): Item {
  const type = String(r.tipo || "FLUJO");
  const msg = String(r.mensaje || "");
  return {
    id: `flujo:${r.id}`, source_id: r.id, source: "notificaciones_flujos", usuario_id: r.usuario_id,
    modulo_origen: "flujos", tipo: type, titulo: String(r.titulo || "Flujo de aprobación"), mensaje: msg,
    entidad_tipo: "documentos_flujos", entidad_id: r.documento_flujo_id ?? null,
    url: "/principal/flujo-aprobaciones", leida: Boolean(r.leida), created_at: r.created_at,
    prioridad: priority(type, msg), categoria: category(type, Boolean(r.leida)), fecha_referencia: null,
  };
}

async function documentAlerts(user: any, days: number): Promise<Item[]> {
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400000).toISOString();
  const { data } = await db.from("documentos_publicaciones").select(`id,documento_id,codigo_publicacion,fecha_publicacion,fecha_fin,publicada,documentos!inner(id,titulo,visibilidad)`).eq("publicada", true).gte("fecha_fin", now.toISOString()).lte("fecha_fin", end);
  if (!data?.length) return [];

  const { data: assignments } = await db.from("usuarios_asignaciones").select("rol_id,cargo_id").eq("usuario_id", user.id).eq("activo", true);
  const roles = (assignments || []).map((x: any) => x.rol_id).filter(Boolean);
  const cargos = (assignments || []).map((x: any) => x.cargo_id).filter(Boolean);
  const result: Item[] = [];

  for (const p of data as any[]) {
    const d = Array.isArray(p.documentos) ? p.documentos[0] : p.documentos;
    if (!d) continue;
    let visible = d.visibilidad === "publico";
    if (!visible) {
      const { data: dest } = await db.from("documentos_destinatarios").select("rol_id,cargo_id,acceso_toda_entidad").eq("documento_id", d.id);
      visible = Boolean(dest?.some((x: any) => x.acceso_toda_entidad || (x.rol_id && roles.includes(x.rol_id)) || (x.cargo_id && cargos.includes(x.cargo_id))));
    }
    if (!visible) continue;
    result.push({
      id: `documento:${p.id}`, source_id: p.id, source: "documentos", usuario_id: user.id,
      modulo_origen: "documentos", tipo: "DOCUMENTO_PROXIMO_VENCIMIENTO",
      titulo: `Publicación próxima a vencer: ${d.titulo}`,
      mensaje: `La publicación ${p.codigo_publicacion || ""} finaliza el ${new Date(p.fecha_fin).toLocaleString("es-CO")}.`,
      entidad_tipo: "documentos", entidad_id: d.id, url: "/principal/documentos", leida: false,
      created_at: p.fecha_publicacion || p.fecha_fin, prioridad: "media", categoria: "proxima", fecha_referencia: p.fecha_fin,
    });
  }
  return result;
}

function dedupe(rows: Item[]) {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = r.entidad_id ? `${r.usuario_id}:${r.modulo_origen}:${r.entidad_id}:${r.tipo}` : r.id;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ success: false, error: "Sesión no válida." }, { status: 401 });
    const p = new URL(req.url).searchParams;
    const modulo = p.get("modulo") || "todos";
    const estado = p.get("estado") || "todas";
    const categoriaFilter = p.get("categoria") || "todas";
    const q = (p.get("q") || "").trim().toLowerCase();
    const days = Math.min(Math.max(Number(p.get("dias_documentos") || 7), 1), 90);

    const [a, b, c, docs] = await Promise.all([
      db.from("notificaciones").select("*").eq("usuario_id", user.id).order("created_at", { ascending: false }),
      db.from("notificaciones_sistema").select("*").eq("usuario_id", user.id).order("created_at", { ascending: false }),
      db.from("notificaciones_flujos").select("*").eq("usuario_id", user.id).order("created_at", { ascending: false }),
      documentAlerts(user, days),
    ]);

    let rows = dedupe([
      ...(a.data || []).map((x: any) => generic(x, "notificaciones")),
      ...(b.data || []).map(system),
      ...(c.data || []).map(flow),
      ...docs,
    ]).sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());

    if (modulo !== "todos") rows = rows.filter((x) => x.modulo_origen === modulo);
    if (estado === "no_leidas") rows = rows.filter((x) => !x.leida);
    if (estado === "leidas") rows = rows.filter((x) => x.leida);
    if (categoriaFilter !== "todas") rows = rows.filter((x) => x.categoria === categoriaFilter);
    if (q) rows = rows.filter((x) => `${x.titulo} ${x.mensaje} ${x.tipo} ${x.modulo_origen}`.toLowerCase().includes(q));

    return NextResponse.json({ success: true, data: rows, resumen: {
      total: rows.length,
      no_leidas: rows.filter((x) => !x.leida).length,
      pendientes: rows.filter((x) => x.categoria === "pendiente").length,
      proximas: rows.filter((x) => x.categoria === "proxima").length,
    }});
  } catch (e: any) {
    console.error("GET /api/notificaciones", e);
    return NextResponse.json({ success: false, error: e?.message || "Error interno." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ success: false, error: "Sesión no válida." }, { status: 401 });
    const body = await req.json();
    const action = body?.action;

    if (action === "marcar_todas") {
      await Promise.all([
        db.from("notificaciones_sistema").update({ leida: true }).eq("usuario_id", user.id).eq("leida", false),
        db.from("notificaciones_flujos").update({ leida: true }).eq("usuario_id", user.id).eq("leida", false),
        db.from("notificaciones").update({ leida: true, fecha_lectura: new Date().toISOString() }).eq("usuario_id", user.id).eq("leida", false),
      ]);
      return NextResponse.json({ success: true });
    }

    if (action !== "marcar_leida" || !body?.id) return NextResponse.json({ success: false, error: "Acción o id inválido." }, { status: 400 });
    const [source, id] = String(body.id).split(":");
    if (source === "sistema") await db.from("notificaciones_sistema").update({ leida: true }).eq("id", id).eq("usuario_id", user.id);
    else if (source === "flujo") await db.from("notificaciones_flujos").update({ leida: true }).eq("id", id).eq("usuario_id", user.id);
    else if (source === "notificaciones") await db.from("notificaciones").update({ leida: true, fecha_lectura: new Date().toISOString() }).eq("id", id).eq("usuario_id", user.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ success: false, error: "Sesión no válida." }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id") || "";
    const [source, sourceId] = id.split(":");
    if (!sourceId) return NextResponse.json({ success: false, error: "Id inválido." }, { status: 400 });
    let error: any = null;
    if (source === "sistema") error = (await db.from("notificaciones_sistema").delete().eq("id", sourceId).eq("usuario_id", user.id)).error;
    else if (source === "flujo") error = (await db.from("notificaciones_flujos").delete().eq("id", sourceId).eq("usuario_id", user.id)).error;
    else if (source === "notificaciones") error = (await db.from("notificaciones").delete().eq("id", sourceId).eq("usuario_id", user.id)).error;
    else return NextResponse.json({ success: false, error: "Notificación no eliminable." }, { status: 400 });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Error interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ success: false, error: "Sesión no válida." }, { status: 401 });
    const b = await req.json();
    const target = String(b.usuario_id || user.id);
    if (target !== user.id && b.internal !== true) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 403 });
    const module = String(b.modulo_origen || b.modulo || "Sistema").toLowerCase();
    const labels: Record<string,string> = { flujos: "Flujo de Aprobaciones", kanban: "Kanban", agenda: "Agenda Institucional", documentos: "Documentos" };
    const { data, error } = await db.from("notificaciones_sistema").insert({
      usuario_id: target, modulo_origen: labels[module] || "Sistema", titulo: String(b.titulo || "Notificación"),
      mensaje: b.mensaje ? String(b.mensaje) : "", referencia_id: b.entidad_id || null, leida: false,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Error interno." }, { status: 500 });
  }
}
