"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Loader2, GitCommit, Calendar, Kanban, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    setCargando(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (!perfil) return;

      const { data, error } = await supabase
        .from("notificaciones_sistema")
        .select("*")
        .eq("usuario_id", perfil.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setNotificaciones(data);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setCargando(false);
    }
  };

  const marcarComoLeida = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones_sistema")
        .update({ leida: true })
        .eq("id", id);

      if (error) throw error;
      setNotificaciones(notificaciones.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (err) {
      console.error("Error al actualizar notificación:", err);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: perfil } = await supabase.from("usuarios").select("id").eq("auth_user_id", authData.user.id).single();
      if (!perfil) return;

      const { error } = await supabase
        .from("notificaciones_sistema")
        .update({ leida: true })
        .eq("usuario_id", perfil.id)
        .eq("leida", false);

      if (error) throw error;
      setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
    }
  };

  const eliminarNotificacion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones_sistema")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNotificaciones(notificaciones.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
    }
  };

  // Filtrar según el módulo seleccionado
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtroModulo === "todos") return true;
    return n.modulo_origen === filtroModulo;
  });

  const obtenerIconoModulo = (modulo: string) => {
    switch (modulo) {
      case "flujos":
        return <GitCommit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case "kanban":
        return <Kanban className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "agenda":
        return <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            Centro de Notificaciones y Alertas
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Historial centralizado de avisos provenientes de Kanban, Agenda y Flujos de Aprobación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={marcarTodasComoLeidas}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl transition-all"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Marcar todas leídas</span>
          </button>
        </div>
      </div>

      {/* Filtros por Módulo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "todos", label: "Todas" },
          { id: "flujos", label: "Flujos de Aprobación" },
          { id: "kanban", label: "Kanban" },
          { id: "agenda", label: "Agenda" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFiltroModulo(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              filtroModulo === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listado de Notificaciones */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : notificacionesFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-gray-100 dark:border-slate-800 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Bandeja limpia</h2>
          <p className="text-xs text-gray-500">No tienes notificaciones o alertas pendientes en esta sección.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificacionesFiltradas.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                item.leida
                  ? "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-75"
                  : "bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-950/50 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0 border border-gray-100 dark:border-slate-700">
                  {obtenerIconoModulo(item.modulo_origen)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                      {item.modulo_origen}
                    </span>
                    {!item.leida && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.titulo}</h3>
                  <p className="text-xs text-gray-600 dark:text-slate-300">{item.mensaje}</p>
                  <span className="text-[10px] text-gray-400 block pt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!item.leida && (
                  <button
                    onClick={() => marcarComoLeida(item.id)}
                    className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-gray-500 hover:text-indigo-600 transition-all"
                    title="Marcar como leída"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => eliminarNotificacion(item.id)}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-gray-400 hover:text-red-600 transition-all"
                  title="Eliminar notificación"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}