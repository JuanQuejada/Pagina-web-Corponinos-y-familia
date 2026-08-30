import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TIPOS_PERMITIDOS = ["Reunión", "Hito", "Comité", "Recordatorio"];
const PRIORIDADES_PERMITIDAS = ["baja", "media", "alta"];
const ESTADOS_PERMITIDOS = ["pendiente", "en_curso", "completado", "cancelado"];

type EventoInput = {
  titulo?: unknown;
  descripcion?: unknown;
  tipo?: unknown;
  fecha_inicio?: unknown;
  fecha_fin?: unknown;
  todo_el_dia?: unknown;
  ubicacion?: unknown;
  enlace_virtual?: unknown;
  estado?: unknown;
  prioridad?: unknown;
  asignado_a?: unknown;
  participantes?: unknown;
  recordatorio_minutos?: unknown;
  recordatorio_enviado?: unknown;
  documento_id?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const v = text(value);
  return v || null;
}

function normalizeParticipants(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => text(v)).filter(Boolean))];
}

function publicUserName(user: any): string {
  if (!user) return "Usuario";
  const razon = text(user.razon_social);
  if (razon) return razon;
  return `${text(user.nombres)} ${text(user.apellidos)}`.trim() || text(user.email) || "Usuario";
}

function bearer(req: NextRequest): string | null {
  const value = req.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

async function getContext(req: NextRequest) {
  const token = bearer(req);
  if (!token) return { error: "Sesión no válida." as string };

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return { error: "Sesión no válida." as string };

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from("usuarios")
    .select("id,nombres,apellidos,razon_social,email,auth_user_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (perfilError || !perfil) return { error: "No se encontró el perfil del usuario." as string };
  return { authUser: authData.user, perfil };
}

async function fetchUsers(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id,nombres,apellidos,razon_social,email,estado_usuario_id")
    .in("id", unique);

  if (error) throw error;
  return new Map((data || []).map((u) => [u.id, u]));
}

async function enrichEvents(rows: any[]) {
  const ids = rows.flatMap((e) => [e.creador_id, e.asignado_a, ...normalizeParticipants(e.participantes)]);
  const users = await fetchUsers(ids);

  return rows.map((e) => {
    const creador = users.get(e.creador_id) || null;
    const asignado = e.asignado_a ? users.get(e.asignado_a) || null : null;
    const participantIds = normalizeParticipants(e.participantes);
    const participantes = participantIds
      .map((id) => users.get(id))
      .filter(Boolean)
      .map((u) => ({
        id: u.id,
        nombre: publicUserName(u),
        email: u.email || null,
      }));

    return {
      ...e,
      creador: creador
        ? { id: creador.id, nombre: publicUserName(creador), email: creador.email || null }
        : null,
      asignado: asignado
        ? { id: asignado.id, nombre: publicUserName(asignado), email: asignado.email || null }
        : null,
      participantes_detalle: participantes,
    };
  });
}

function validateDateRange(fechaInicio: string, fechaFin: string | null, todoElDia: boolean) {
  if (!fechaInicio) return "La fecha de inicio es obligatoria.";
  const start = new Date(fechaInicio);
  if (Number.isNaN(start.getTime())) return "La fecha de inicio no es válida.";
  if (fechaFin) {
    const end = new Date(fechaFin);
    if (Number.isNaN(end.getTime())) return "La fecha de finalización no es válida.";
    if (end < start) return "La fecha de finalización no puede ser anterior al inicio.";
  }
  return null;
}

function normalizeInput(body: EventoInput, currentUserId: string, partial = false) {
  const titulo = text(body.titulo);
  const descripcion = nullableText(body.descripcion);
  const tipo = text(body.tipo) || "Reunión";
  const fecha_inicio = text(body.fecha_inicio);
  const fecha_fin = nullableText(body.fecha_fin);
  const todo_el_dia = Boolean(body.todo_el_dia);
  const ubicacion = nullableText(body.ubicacion);
  const enlace_virtual = nullableText(body.enlace_virtual);
  const prioridad = text(body.prioridad) || "media";
  const asignado_a = nullableText(body.asignado_a);
  const participantes = normalizeParticipants(body.participantes);
  const recordatorioRaw = Number(body.recordatorio_minutos ?? 15);
  const recordatorio_minutos = Number.isFinite(recordatorioRaw) && recordatorioRaw >= 0 ? Math.floor(recordatorioRaw) : 15;
  const estado = text(body.estado) || "pendiente";
  const documento_id = nullableText(body.documento_id);

  if (!partial && !titulo) throw new Error("El título del evento es obligatorio.");
  if (body.tipo !== undefined && !TIPOS_PERMITIDOS.includes(tipo)) throw new Error("El tipo de evento no es válido.");
  if (body.prioridad !== undefined && !PRIORIDADES_PERMITIDAS.includes(prioridad)) throw new Error("La prioridad no es válida.");
  if (body.estado !== undefined && !ESTADOS_PERMITIDOS.includes(estado)) throw new Error("El estado del evento no es válido.");
  if (!partial) {
    const dateError = validateDateRange(fecha_inicio, fecha_fin, todo_el_dia);
    if (dateError) throw new Error(dateError);
  }

  const result: Record<string, any> = {};
  if (!partial || body.titulo !== undefined) result.titulo = titulo;
  if (!partial || body.descripcion !== undefined) result.descripcion = descripcion;
  if (!partial || body.tipo !== undefined) result.tipo = tipo;
  if (!partial || body.fecha_inicio !== undefined) result.fecha_inicio = fecha_inicio;
  if (!partial || body.fecha_fin !== undefined) result.fecha_fin = fecha_fin;
  if (!partial || body.todo_el_dia !== undefined) result.todo_el_dia = todo_el_dia;
  if (!partial || body.ubicacion !== undefined) result.ubicacion = ubicacion;
  if (!partial || body.enlace_virtual !== undefined) result.enlace_virtual = enlace_virtual;
  if (!partial || body.estado !== undefined) result.estado = estado;
  if (!partial || body.prioridad !== undefined) result.prioridad = prioridad;
  if (!partial || body.asignado_a !== undefined) result.asignado_a = asignado_a;
  if (!partial || body.participantes !== undefined) result.participantes = participantes;
  if (!partial || body.recordatorio_minutos !== undefined) result.recordatorio_minutos = recordatorio_minutos;
  if (body.recordatorio_enviado !== undefined) result.recordatorio_enviado = Boolean(body.recordatorio_enviado);
  if (body.documento_id !== undefined) result.documento_id = documento_id;
  if (!partial) result.creador_id = currentUserId;
  return result;
}

async function notifyUsers(userIds: string[], title: string, message: string, referenceId: string) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;

  const rows = ids.map((usuario_id) => ({
    usuario_id,
    modulo_origen: "agenda",
    titulo: title,
    mensaje: message,
    referencia_id: referenceId,
    leida: false,
  }));

  const { error } = await supabaseAdmin.from("notificaciones_sistema").insert(rows);
  if (error) {
    // La creación/edición del evento no debe fallar por una notificación.
    console.error("Error registrando notificaciones de Agenda:", error);
  }
}

async function notifyGeneric(userIds: string[], type: string, title: string, message: string, referenceId: string, url = "/principal/agenda") {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const rows = ids.map((usuario_id) => ({
    usuario_id,
    tipo: type,
    titulo: title,
    mensaje: message,
    entidad_tipo: "eventos",
    entidad_id: referenceId,
    url,
    leida: false,
  }));
  const { error } = await supabaseAdmin.from("notificaciones").insert(rows);
  if (error) console.error("Error registrando notificación general de Agenda:", error);
}

async function notifyEventUsers(evento: any, actorId: string, action: "created" | "updated" | "cancelled" | "completed") {
  const recipients = [evento.creador_id, evento.asignado_a, ...normalizeParticipants(evento.participantes)];
  const targetIds = [...new Set(recipients.filter((id) => id && id !== actorId))];
  if (!targetIds.length) return;

  const messages: Record<typeof action, [string, string, string]> = {
    created: ["AGENDA_EVENTO_NUEVO", "Nuevo evento institucional", `Se ha creado el evento "${evento.titulo}" y formas parte de sus involucrados.`],
    updated: ["AGENDA_EVENTO_ACTUALIZADO", "Evento institucional actualizado", `El evento "${evento.titulo}" fue actualizado.`],
    cancelled: ["AGENDA_EVENTO_CANCELADO", "Evento institucional cancelado", `El evento "${evento.titulo}" fue cancelado.`],
    completed: ["AGENDA_EVENTO_COMPLETADO", "Evento institucional completado", `El evento "${evento.titulo}" fue marcado como completado.`],
  };
  const [type, title, message] = messages[action];
  await notifyUsers(targetIds, title, message, evento.id);
  await notifyGeneric(targetIds, type, title, message, evento.id);
}

export async function GET(req: NextRequest) {
  try {
    const context = await getContext(req);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });

    const url = new URL(req.url);
    const q = text(url.searchParams.get("q"));
    const estado = text(url.searchParams.get("estado"));
    const prioridad = text(url.searchParams.get("prioridad"));
    const tipo = text(url.searchParams.get("tipo"));
    const desde = text(url.searchParams.get("desde"));
    const hasta = text(url.searchParams.get("hasta"));
    const scope = text(url.searchParams.get("scope")) || "todos";

    let query = supabaseAdmin.from("eventos").select("*").order("fecha_inicio", { ascending: true });

    if (estado) query = query.eq("estado", estado);
    if (prioridad) query = query.eq("prioridad", prioridad);
    if (tipo) query = query.eq("tipo", tipo);
    if (desde) query = query.gte("fecha_inicio", desde);
    if (hasta) query = query.lte("fecha_inicio", hasta);

    // Como la tabla no tiene FKs ni políticas RLS, el endpoint resuelve el acceso de forma explícita.
    if (scope === "mios") {
      query = query.eq("creador_id", context.perfil.id);
    } else if (scope === "asignados") {
      query = query.eq("asignado_a", context.perfil.id);
    } else if (scope === "involucrado") {
      const { data: all, error } = await query;
      if (error) throw error;
      const filtered = (all || []).filter((e) =>
        e.creador_id === context.perfil.id ||
        e.asignado_a === context.perfil.id ||
        normalizeParticipants(e.participantes).includes(context.perfil.id)
      );
      const enriched = await enrichEvents(q ? filtered.filter((e) => JSON.stringify(e).toLowerCase().includes(q.toLowerCase())) : filtered);
      return NextResponse.json({ data: enriched, total: enriched.length });
    }

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((e) => [e.titulo, e.descripcion, e.tipo, e.ubicacion, e.estado, e.prioridad].some((v) => text(v).toLowerCase().includes(needle)));
    }

    const enriched = await enrichEvents(rows);
    return NextResponse.json({ data: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("GET /api/agenda:", error);
    return NextResponse.json({ error: error?.message || "No fue posible consultar la agenda." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getContext(req);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });

    const body = (await req.json()) as EventoInput;
    const payload = normalizeInput(body, context.perfil.id, false);

    const userIds = [payload.asignado_a, ...normalizeParticipants(payload.participantes)].filter(Boolean) as string[];
    if (userIds.length) {
      const users = await fetchUsers(userIds);
      const invalid = userIds.find((id) => !users.has(id));
      if (invalid) return NextResponse.json({ error: "Uno de los usuarios seleccionados no existe." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("eventos").insert(payload).select("*").single();
    if (error) throw error;

    await notifyEventUsers(data, context.perfil.id, "created");
    const enriched = (await enrichEvents([data]))[0];
    return NextResponse.json({ data: enriched, message: "Evento creado correctamente." }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/agenda:", error);
    return NextResponse.json({ error: error?.message || "No fue posible crear el evento." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await getContext(req);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });

    const body = (await req.json()) as EventoInput & { id?: unknown };
    const id = text(body.id);
    if (!id) return NextResponse.json({ error: "El id del evento es obligatorio." }, { status: 400 });

    const { data: actual, error: findError } = await supabaseAdmin.from("eventos").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!actual) return NextResponse.json({ error: "El evento no existe." }, { status: 404 });

    const esInvolucrado = actual.creador_id === context.perfil.id || actual.asignado_a === context.perfil.id || normalizeParticipants(actual.participantes).includes(context.perfil.id);
    if (!esInvolucrado) return NextResponse.json({ error: "No tienes autorización para modificar este evento." }, { status: 403 });

    const payload = normalizeInput(body, context.perfil.id, true);
    delete payload.creador_id;

    if (payload.fecha_inicio !== undefined || payload.fecha_fin !== undefined || payload.todo_el_dia !== undefined) {
      const start = payload.fecha_inicio ?? actual.fecha_inicio;
      const end = payload.fecha_fin !== undefined ? payload.fecha_fin : actual.fecha_fin;
      const allDay = payload.todo_el_dia !== undefined ? payload.todo_el_dia : actual.todo_el_dia;
      const dateError = validateDateRange(start, end, allDay);
      if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("eventos").update(payload).eq("id", id).select("*").single();
    if (error) throw error;

    const action = data.estado === "cancelado" ? "cancelled" : data.estado === "completado" ? "completed" : "updated";
    await notifyEventUsers(data, context.perfil.id, action);
    const enriched = (await enrichEvents([data]))[0];
    return NextResponse.json({ data: enriched, message: "Evento actualizado correctamente." });
  } catch (error: any) {
    console.error("PATCH /api/agenda:", error);
    return NextResponse.json({ error: error?.message || "No fue posible actualizar el evento." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await getContext(req);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });

    const url = new URL(req.url);
    const id = text(url.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "El id del evento es obligatorio." }, { status: 400 });

    const { data: actual, error: findError } = await supabaseAdmin.from("eventos").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!actual) return NextResponse.json({ error: "El evento no existe." }, { status: 404 });
    if (actual.creador_id !== context.perfil.id) return NextResponse.json({ error: "Solo el creador puede eliminar el evento." }, { status: 403 });

    // Se mantiene la posibilidad de eliminar físicamente para no cambiar el comportamiento actual.
    const { error } = await supabaseAdmin.from("eventos").delete().eq("id", id);
    if (error) throw error;

    await notifyEventUsers(actual, context.perfil.id, "cancelled");
    return NextResponse.json({ message: "Evento eliminado correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/agenda:", error);
    return NextResponse.json({ error: error?.message || "No fue posible eliminar el evento." }, { status: 500 });
  }
}
