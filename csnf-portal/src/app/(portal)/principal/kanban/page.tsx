"use client";

import { useEffect, useState } from "react";
import { Kanban, Plus, Calendar, User, AlertCircle, Loader2, MoreVertical, Trash2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function KanbanPage() {
  const [columnas, setColumnas] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(null);

  // Estados para Modal de Nueva Tarea
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevaTareaForm, setNuevaTareaForm] = useState({
    titulo: "",
    descripcion: "",
    columna_id: "",
    asignado_id: "",
    prioridad: "Media",
    fecha_vencimiento: "",
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarDatosKanban();
  }, []);

  const cargarDatosKanban = async () => {
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

      // Cargar columnas, tareas y usuarios en paralelo
      const [resCols, resTareas, resUsers] = await Promise.all([
        supabase.from("kanban_columnas").select("*").order("orden", { ascending: true }),
        supabase.from("kanban_tareas").select(`
          *,
          asignado:usuarios!kanban_tareas_asignado_id_fkey(id, nombres, apellidos, razon_social)
        `).order("created_at", { ascending: false }),
        supabase.from("usuarios").select("id, nombres, apellidos, razon_social").order("nombres", { ascending: true })
      ]);

      if (resCols.data) {
        setColumnas(resCols.data);
        if (resCols.data.length > 0) {
          setNuevaTareaForm(prev => ({ ...prev, columna_id: resCols.data[0].id }));
        }
      }
      if (resTareas.data) setTareas(resTareas.data);
      if (resUsers.data) setUsuarios(resUsers.data);

    } catch (err) {
      console.error("Error al cargar Kanban:", err);
    } finally {
      setCargando(false);
    }
  };

  const crearTareaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTareaForm.titulo || !nuevaTareaForm.columna_id) {
      alert("El título y la columna son obligatorios.");
      return;
    }

    setCreando(true);
    try {
      const { error } = await supabase.from("kanban_tareas").insert([{
        titulo: nuevaTareaForm.titulo,
        descripcion: nuevaTareaForm.descripcion,
        columna_id: nuevaTareaForm.columna_id,
        asignado_id: nuevaTareaForm.asignado_id || null,
        creador_id: currentPerfilId,
        prioridad: nuevaTareaForm.prioridad,
        fecha_vencimiento: nuevaTareaForm.fecha_vencimiento || null,
      }]);

      if (error) throw error;

      // Generar notificación si se asignó a alguien distinto
      if (nuevaTareaForm.asignado_id && nuevaTareaForm.asignado_id !== currentPerfilId) {
        await supabase.from("notificaciones_sistema").insert([{
          usuario_id: nuevaTareaForm.asignado_id,
          modulo_origen: "kanban",
          titulo: "Nueva tarea asignada",
          mensaje: `Se te ha asignado la tarea: "${nuevaTareaForm.titulo}"`,
        }]);
      }

      alert("¡Tarea creada exitosamente!");
      setModalAbierto(false);
      setNuevaTareaForm({
        titulo: "",
        descripcion: "",
        columna_id: columnas[0]?.id || "",
        asignado_id: "",
        prioridad: "Media",
        fecha_vencimiento: "",
      });
      cargarDatosKanban();

    } catch (err: any) {
      alert("Error al crear tarea: " + err.message);
    } finally {
      setCreando(false);
    }
  };

  const cambiarColumnaTarea = async (tareaId: string, nuevaColumnaId: string) => {
    try {
      const { error } = await supabase
        .from("kanban_tareas")
        .update({ columna_id: nuevaColumnaId })
        .eq("id", tareaId);

      if (error) throw error;
      setTareas(tareas.map(t => t.id === tareaId ? { ...t, columna_id: nuevaColumnaId } : t));
    } catch (err) {
      console.error("Error al mover tarea:", err);
    }
  };

  const eliminarTarea = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta tarea?")) return;
    try {
      const { error } = await supabase.from("kanban_tareas").delete().eq("id", id);
      if (error) throw error;
      setTareas(tareas.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  const obtenerColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "Alta": return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
      case "Baja": return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
      default: return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-[85vh]">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Kanban className="h-6 w-6 text-indigo-600" />
            Tablero Kanban de Tareas y Proyectos
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Organiza el flujo de trabajo operativo de tu equipo en tiempo real.
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* CONTENEDOR DE COLUMNAS KANBAN */}
      {cargando ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columnas.map((columna, colIndex) => {
            const tareasColumna = tareas.filter(t => t.columna_id === columna.id);

            return (
              <div key={columna.id} className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-gray-200/60 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
                    {columna.nombre}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300">
                    {tareasColumna.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="space-y-3 min-h-[400px]">
                  {tareasColumna.length === 0 ? (
                    <div className="text-center py-10 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                      Sin tareas en esta lista
                    </div>
                  ) : (
                    tareasColumna.map((tarea) => {
                      const asignadoNombre = tarea.asignado 
                        ? (tarea.asignado.razon_social || `${tarea.asignado.nombres || ""} ${tarea.asignado.apellidos || ""}`) 
                        : "Sin asignar";

                      return (
                        <div key={tarea.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-3 relative group">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${obtenerColorPrioridad(tarea.prioridad)}`}>
                              {tarea.prioridad}
                            </span>
                            <button
                              onClick={() => eliminarTarea(tarea.id)}
                              className="text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">{tarea.titulo}</h4>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {tarea.descripcion || "Sin descripción"}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-400">
                            <span className="flex items-center gap-1 truncate max-w-[120px]">
                              <User className="h-3 w-3 shrink-0" /> {asignadoNombre}
                            </span>
                            {tarea.fecha_vencimiento && (
                              <span className="flex items-center gap-1 shrink-0 text-amber-600 dark:text-amber-400 font-medium">
                                <Calendar className="h-3 w-3" /> {tarea.fecha_vencimiento}
                              </span>
                            )}
                          </div>

                          {/* Botones rápidos para mover de columna */}
                          <div className="pt-2 flex items-center justify-between border-t border-dashed border-gray-100 dark:border-slate-800">
                            {colIndex > 0 && (
                              <button
                                onClick={() => cambiarColumnaTarea(tarea.id, columnas[colIndex - 1].id)}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                              >
                                <ArrowLeft className="h-3 w-3" /> {columnas[colIndex - 1].nombre}
                              </button>
                            )}
                            <div className="ml-auto">
                              {colIndex < columnas.length - 1 && (
                                <button
                                  onClick={() => cambiarColumnaTarea(tarea.id, columnas[colIndex + 1].id)}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                >
                                  {columnas[colIndex + 1].nombre} <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVA TAREA */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Crear Nueva Tarea
            </h3>

            <form onSubmit={crearTareaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  value={nuevaTareaForm.titulo}
                  onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, titulo: e.target.value})}
                  placeholder="Ej: Revisar informe financiero trimestral"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descripción</label>
                <textarea
                  value={nuevaTareaForm.descripcion}
                  onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, descripcion: e.target.value})}
                  placeholder="Detalles de la tarea..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Columna / Estado *</label>
                  <select
                    value={nuevaTareaForm.columna_id}
                    onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, columna_id: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    required
                  >
                    {columnas.map((col) => (
                      <option key={col.id} value={col.id}>{col.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Prioridad</label>
                  <select
                    value={nuevaTareaForm.prioridad}
                    onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, prioridad: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Asignar a Usuario</label>
                  <select
                    value={nuevaTareaForm.asignado_id}
                    onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, asignado_id: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>{u.razon_social || `${u.nombres || ""} ${u.apellidos || ""}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={nuevaTareaForm.fecha_vencimiento}
                    onChange={(e) => setNuevaTareaForm({...nuevaTareaForm, fecha_vencimiento: e.target.value})}
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
                  <span>Crear Tarea</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}