"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Video, User, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AgendaPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(null);

  // Estados del Modal de Nuevo Evento
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoEventoForm, setNuevoEventoForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "Reunión",
    fecha_inicio: "",
    fecha_fin: "",
    todo_el_dia: false,
    ubicacion: "",
    enlace_virtual: "",
    prioridad: "media",
    asignado_a: "",
    recordatorio_minutos: 15,
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarDatosAgenda();
  }, []);

  const cargarDatosAgenda = async () => {
    setCargando(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (perfil) setCurrentPerfilId(perfil.id);

      // Cargar eventos y usuarios en paralelo
      const [resEventos, resUsers] = await Promise.all([
        supabase.from("eventos").select(`
          *,
          creador:usuarios!eventos_creador_id_fkey(id, nombres, apellidos, razon_social),
          asignado:usuarios!eventos_asignado_a_fkey(id, nombres, apellidos, razon_social)
        `).order("fecha_inicio", { ascending: true }),
        supabase.from("usuarios").select("id, nombres, apellidos, razon_social").order("nombres", { ascending: true })
      ]);

      if (resEventos.data) setEventos(resEventos.data);
      if (resUsers.data) setUsuarios(resUsers.data);

    } catch (err) {
      console.error("Error al cargar la agenda:", err);
    } finally {
      setCargando(false);
    }
  };

  const crearEventoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEventoForm.titulo || !nuevoEventoForm.fecha_inicio) {
      alert("El título y la fecha de inicio son obligatorios.");
      return;
    }

    setCreando(true);
    try {
      // 1. Insertar el evento utilizando exactamente los campos de tu tabla (Corregido con ?? "")
      const { data: eventoCreado, error: errorEvento } = await supabase
        .from("eventos")
        .insert([{
          titulo: nuevoEventoForm.titulo,
          descripcion: nuevoEventoForm.descripcion,
          tipo: nuevoEventoForm.tipo,
          fecha_inicio: nuevoEventoForm.fecha_inicio,
          fecha_fin: nuevoEventoForm.fecha_fin || null,
          todo_el_dia: nuevoEventoForm.todo_el_dia,
          ubicacion: nuevoEventoForm.ubicacion,
          enlace_virtual: nuevoEventoForm.enlace_virtual,
          prioridad: nuevoEventoForm.prioridad,
          creador_id: currentPerfilId ?? "",
          asignado_a: nuevoEventoForm.asignado_a || null,
          recordatorio_minutos: Number(nuevoEventoForm.recordatorio_minutos),
        }])
        .select()
        .single();

      if (errorEvento) throw errorEvento;

      // 2. Si se asignó a un usuario diferente, registrar la notificación automática
      if (nuevoEventoForm.asignado_a && nuevoEventoForm.asignado_a !== currentPerfilId && eventoCreado) {
        await supabase.from("notificaciones_sistema").insert([{
          usuario_id: nuevoEventoForm.asignado_a,
          modulo_origen: "agenda",
          titulo: "Nuevo evento asignado",
          mensaje: `Se te ha asignado el evento institucional: "${nuevoEventoForm.titulo}"`,
          referencia_id: eventoCreado.id
        }]);
      }

      alert("¡Evento institucional creado con éxito!");
      setModalAbierto(false);
      setNuevoEventoForm({
        titulo: "",
        descripcion: "",
        tipo: "Reunión",
        fecha_inicio: "",
        fecha_fin: "",
        todo_el_dia: false,
        ubicacion: "",
        enlace_virtual: "",
        prioridad: "media",
        asignado_a: "",
        recordatorio_minutos: 15,
      });
      cargarDatosAgenda();

    } catch (err: any) {
      alert("Error al crear el evento: " + err.message);
    } finally {
      setCreando(false);
    }
  };

  const eliminarEvento = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este evento de la agenda?")) return;
    try {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
      setEventos(eventos.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error al eliminar evento:", err);
    }
  };

  const obtenerColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
      case "baja": return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
      default: return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto min-h-[85vh]">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-indigo-600" />
            Agenda Institucional y Eventos
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Programa reuniones, juntas directivas y hitos corporativos sincronizados con notificaciones.
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Evento</span>
        </button>
      </div>

      {/* LISTADO DE EVENTOS */}
      {cargando ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-gray-100 dark:border-slate-800 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sin eventos programados</h2>
          <p className="text-xs text-gray-500">Actualmente no hay reuniones ni eventos registrados en la agenda institucional.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventos.map((evento) => {
            const fechaInicioFmt = new Date(evento.fecha_inicio).toLocaleString();
            const fechaFinFmt = evento.fecha_fin ? new Date(evento.fecha_fin).toLocaleString() : null;
            const asignadoNombre = evento.asignado 
              ? (evento.asignado.razon_social || `${evento.asignado.nombres || ""} ${evento.asignado.apellidos || ""}`) 
              : "Sin asignar";

            return (
              <div key={evento.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 relative group">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                        {evento.tipo}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${obtenerColorPrioridad(evento.prioridad)}`}>
                        {evento.prioridad}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white pt-1">{evento.titulo}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {evento.descripcion || "Sin descripción detallada"}
                    </p>
                  </div>

                  <button
                    onClick={() => eliminarEvento(evento.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar evento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span><strong>Inicio:</strong> {fechaInicioFmt}</span>
                  </div>
                  {fechaFinFmt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Fin:</strong> {fechaFinFmt}</span>
                    </div>
                  )}
                  {evento.ubicacion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>{evento.ubicacion}</span>
                    </div>
                  )}
                  {evento.enlace_virtual && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-600 shrink-0" />
                      <a href={evento.enlace_virtual} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[280px]">
                        {evento.enlace_virtual}
                      </a>
                    </div>
                  )}
                </div>

                {/* Responsable / Asignado */}
                <div className="pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    <strong>Asignado a:</strong> {asignadoNombre}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Recordatorio: {evento.recordatorio_minutos} min antes
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVO EVENTO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Agendar Nuevo Evento Institucional
            </h3>

            <form onSubmit={crearEventoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Título del Evento *</label>
                <input
                  type="text"
                  value={nuevoEventoForm.titulo}
                  onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, titulo: e.target.value})}
                  placeholder="Ej: Junta directiva mensual"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Tipo de Evento</label>
                  <select
                    value={nuevoEventoForm.tipo}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, tipo: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  >
                    <option value="Reunión">Reunión</option>
                    <option value="Hito">Hito</option>
                    <option value="Comité">Comité</option>
                    <option value="Recordatorio">Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Prioridad</label>
                  <select
                    value={nuevoEventoForm.prioridad}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, prioridad: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descripción</label>
                <textarea
                  value={nuevoEventoForm.descripcion}
                  onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, descripcion: e.target.value})}
                  placeholder="Detalles de la agenda..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha y Hora de Inicio *</label>
                  <input
                    type="datetime-local"
                    value={nuevoEventoForm.fecha_inicio}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, fecha_inicio: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha y Hora de Fin</label>
                  <input
                    type="datetime-local"
                    value={nuevoEventoForm.fecha_fin}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, fecha_fin: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Ubicación Física</label>
                  <input
                    type="text"
                    value={nuevoEventoForm.ubicacion}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, ubicacion: e.target.value})}
                    placeholder="Ej: Sala de Juntas Principal"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Enlace Virtual</label>
                  <input
                    type="text"
                    value={nuevoEventoForm.enlace_virtual}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, enlace_virtual: e.target.value})}
                    placeholder="Ej: https://meet.google.com/..."
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Asignar Responsable</label>
                  <select
                    value={nuevoEventoForm.asignado_a}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, asignado_a: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>{u.razon_social || `${u.nombres || ""} ${u.apellidos || ""}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Recordatorio (Minutos antes)</label>
                  <input
                    type="number"
                    value={nuevoEventoForm.recordatorio_minutos}
                    onChange={(e) => setNuevoEventoForm({...nuevoEventoForm, recordatorio_minutos: Number(e.target.value)})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md"
                >
                  {creando && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Guardar Evento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}