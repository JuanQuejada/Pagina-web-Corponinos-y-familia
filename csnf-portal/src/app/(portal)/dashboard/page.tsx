"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Users,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Building2,
  Bell,
  CheckCircle2,
  Clock,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Estadisticas {
  totalDocumentos: number;
  totalUsuarios: number;
  totalRoles: number;
  totalLogs: number;
}

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string | null;
  tipo: string;
  url: string | null;
  created_at: string | null;
  leida: boolean | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Estadisticas>({
    totalDocumentos: 0,
    totalUsuarios: 0,
    totalRoles: 0,
    totalLogs: 0,
  });
  const [nombreEntidad, setNombreEntidad] = useState("Portal Documental");
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    setCargando(true);
    try {
      // 1. Obtener nombre de la entidad desde configuración del sistema
      const { data: config } = await supabase
        .from("configuracion_sistema")
        .select("nombre_entidad, nombre_portal")
        .limit(1)
        .single();

      if (config) {
        setNombreEntidad(config.nombre_portal || config.nombre_entidad);
      }

      // 2. Contar registros reales de las tablas clave
      const [
        { count: countUsuarios },
        { count: countRoles },
        { count: countLogs },
        { count: countDocumentos },
      ] = await Promise.all([
        supabase.from("usuarios").select("*", { count: "exact", head: true }),
        supabase.from("roles").select("*", { count: "exact", head: true }),
        supabase.from("auditoria_logs").select("*", { count: "exact", head: true }),
        supabase.from("documentos").select("*", { count: "exact", head: true }),
      ]);

      // 3. Cargar notificaciones pendientes (no leídas)
      const { data: notifsData } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("leida", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalDocumentos: countDocumentos || 0,
        totalUsuarios: countUsuarios || 0,
        totalRoles: countRoles || 0,
        totalLogs: countLogs || 0,
      });

      if (notifsData) {
        setNotificaciones(notifsData);
      }
    } catch (err) {
      console.error("Error al cargar métricas del dashboard:", err);
    } finally {
      setCargando(false);
    }
  };

  // Función para atender y marcar como leída (desaparecer la alerta)
  const atenderNotificacion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true, fecha_lectura: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        // Remover localmente para que desaparezca al instante
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Error al atender notificación:", err);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Banner de Bienvenida Moderno */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>Sistema Operativo y Sincronizado con Supabase</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Bienvenido al Portal de {nombreEntidad}
            </h1>
            <p className="text-xs md:text-sm text-blue-100 max-w-xl">
              Panel centralizado de gestión documental, control de flujos de firma y trazabilidad corporativa.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/documentos"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-xl text-xs shadow-lg transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Ver Documentos</span>
            </Link>
            <Link
              href="/administracion/auditoria"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/40 hover:bg-blue-500/60 text-white border border-white/20 font-semibold rounded-xl text-xs backdrop-blur-md transition-all"
            >
              <Activity className="h-4 w-4" />
              <span>Auditoría</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400">Documentos Totales</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {cargando ? "..." : stats.totalDocumentos}
            </h3>
            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
              <FolderOpen className="h-3 w-3" /> Repositorio activo
            </span>
          </div>
          <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400">Usuarios Registrados</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {cargando ? "..." : stats.totalUsuarios}
            </h3>
            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Activos en plataforma
            </span>
          </div>
          <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400">Roles de Seguridad</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {cargando ? "..." : stats.totalRoles}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">Jerarquías configuradas</span>
          </div>
          <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400">Registros de Auditoría</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {cargando ? "..." : stats.totalLogs}
            </h3>
            <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
              <Activity className="h-3 w-3" /> Trazabilidad total
            </span>
          </div>
          <div className="h-12 w-12 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 dark:border-purple-900">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Panel de Alertas Dinámicas y Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Centro de Alertas Interactivas */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" /> Alertas y Pendientes por Atender
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
              {notificaciones.length} pendientes
            </span>
          </div>

          {notificaciones.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">¡Estás al día!</p>
              <p className="text-[11px] text-gray-400">No tienes notificaciones ni firmas pendientes en este momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-100 dark:border-slate-800 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">{notif.titulo}</h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300">{notif.mensaje}</p>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                      <Clock className="h-3 w-3" /> {new Date(notif.created_at as any).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => atenderNotificacion(notif.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-all shrink-0"
                  >
                    <span>Atender</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos Rápidos Principales */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" /> Accesos Corporativos
          </h2>
          <div className="space-y-2.5">
            <Link
              href="/administracion/usuarios"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <span>Gestionar Usuarios</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-all" />
            </Link>

            <Link
              href="/administracion/roles"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Roles y Permisos</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-all" />
            </Link>

            <Link
              href="/administracion/auditoria"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-lg">
                  <Activity className="h-4 w-4" />
                </div>
                <span>Centro de Auditoría</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-all" />
            </Link>

            <Link
              href="/administracion/ajustes"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
                <span>Ajustes del Sistema</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}