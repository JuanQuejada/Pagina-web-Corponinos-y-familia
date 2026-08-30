"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  GitCommit,
  Calendar,
  Kanban,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Search,
  RefreshCw,
  ChevronRight,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Modulo =
  | "todos"
  | "flujos"
  | "kanban"
  | "agenda"
  | "documentos"
  | "sistema";

type Item = {
  id: string;
  modulo_origen: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  created_at: string;
  prioridad: string;
  categoria: string;
  fecha_referencia: string | null;
};

const cfg: Record<
  string,
  {
    label: string;
    icon: any;
    soft: string;
    color: string;
  }
> = {
  flujos: {
    label: "Flujos de Aprobación",
    icon: GitCommit,
    soft: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900",
    color: "text-indigo-600 dark:text-indigo-400",
  },

  kanban: {
    label: "Kanban",
    icon: Kanban,
    soft: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900",
    color: "text-amber-600 dark:text-amber-400",
  },

  agenda: {
    label: "Agenda Institucional",
    icon: Calendar,
    soft: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900",
    color: "text-emerald-600 dark:text-emerald-400",
  },

  documentos: {
    label: "Documentos",
    icon: FileText,
    soft: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900",
    color: "text-cyan-600 dark:text-cyan-400",
  },

  sistema: {
    label: "Sistema",
    icon: Bell,
    soft: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    color: "text-slate-600 dark:text-slate-400",
  },
};

export default function NotificacionesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [modulo, setModulo] = useState<Modulo>("todos");
  const [estado, setEstado] = useState("todas");
  const [categoria, setCategoria] = useState("todas");
  const [q, setQ] = useState("");

  const [detail, setDetail] = useState<Item | null>(null);

  /*
   * IDs de las notificaciones actualmente seleccionadas.
   */
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);

  /*
   * Indica si se está ejecutando la eliminación masiva.
   */
  const [eliminandoSeleccionadas, setEliminandoSeleccionadas] =
    useState(false);

  const [summary, setSummary] = useState({
    total: 0,
    no_leidas: 0,
    pendientes: 0,
    proximas: 0,
  });

  const token = useCallback(
    async () =>
      (await supabase.auth.getSession()).data.session?.access_token || "",
    []
  );

  /*
   * ============================================================
   * CARGAR NOTIFICACIONES
   * ============================================================
   */
  const load = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      try {
        const t = await token();

        if (!t) {
          throw new Error("Sesión no disponible.");
        }

        const p = new URLSearchParams({
          modulo,
          estado,
          categoria,
          q,
          dias_documentos: "7",
        });

        const r = await fetch(`/api/notificaciones?${p}`, {
          headers: {
            Authorization: `Bearer ${t}`,
          },
          cache: "no-store",
        });

        const d = await r.json();

        if (!r.ok || !d.success) {
          throw new Error(
            d.error || "No fue posible cargar las notificaciones."
          );
        }

        setItems(d.data || []);

        setSummary(
          d.resumen || {
            total: 0,
            no_leidas: 0,
            pendientes: 0,
            proximas: 0,
          }
        );

        /*
         * Si cambiamos de filtro, eliminamos de la selección
         * los elementos que ya no están visibles.
         */
        setSeleccionadas((prev) =>
          prev.filter((id) => (d.data || []).some((x: Item) => x.id === id))
        );
      } catch (e: any) {
        setError(
          e?.message || "Error cargando notificaciones."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [modulo, estado, categoria, q, token]
  );

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Actualización automática cada 30 segundos.
   */
  useEffect(() => {
    const x = setInterval(() => load(true), 30000);

    return () => clearInterval(x);
  }, [load]);

  /*
   * ============================================================
   * MARCAR UNA NOTIFICACIÓN COMO LEÍDA
   * ============================================================
   */
  const mark = async (item: Item) => {
    if (item.leida) return;

    const t = await token();

    if (!t) return;

    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "marcar_leida",
        id: item.id,
      }),
    });

    setItems((v) =>
      v.map((x) =>
        x.id === item.id
          ? {
              ...x,
              leida: true,
            }
          : x
      )
    );

    setSummary((s) => ({
      ...s,
      no_leidas: Math.max(0, s.no_leidas - 1),
    }));
  };

  /*
   * ============================================================
   * MARCAR TODAS COMO LEÍDAS
   * ============================================================
   */
  const markAll = async () => {
    const t = await token();

    if (!t) return;

    const r = await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "marcar_todas",
      }),
    });

    if (r.ok) {
      setItems((v) =>
        v.map((x) => ({
          ...x,
          leida: true,
        }))
      );

      setSummary((s) => ({
        ...s,
        no_leidas: 0,
      }));
    }
  };

  /*
   * ============================================================
   * ELIMINAR UNA NOTIFICACIÓN
   * ============================================================
   */
  const remove = async (item: Item) => {
    if (!confirm("¿Deseas eliminar esta notificación?")) {
      return;
    }

    const t = await token();

    if (!t) {
      alert("Sesión no disponible.");
      return;
    }

    try {
      const r = await fetch(
        `/api/notificaciones?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${t}`,
          },
        }
      );

      if (!r.ok) {
        throw new Error(
          "No fue posible eliminar la notificación."
        );
      }

      /*
       * Eliminamos de la interfaz.
       */
      setItems((v) =>
        v.filter((x) => x.id !== item.id)
      );

      /*
       * Si estaba seleccionada, también la quitamos.
       */
      setSeleccionadas((prev) =>
        prev.filter((id) => id !== item.id)
      );

      /*
       * Actualizamos los contadores.
       */
      setSummary((s) => ({
        ...s,
        total: Math.max(0, s.total - 1),
        no_leidas: item.leida
          ? s.no_leidas
          : Math.max(0, s.no_leidas - 1),
      }));

      if (detail?.id === item.id) {
        setDetail(null);
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "No fue posible eliminar la notificación."
      );
    }
  };

  /*
   * ============================================================
   * ABRIR NOTIFICACIÓN
   * ============================================================
   */
  const open = async (item: Item) => {
    await mark(item);

    if (item.url) {
      window.location.href = item.url;
    } else {
      setDetail(item);
    }
  };

  /*
   * ============================================================
   * FECHAS
   * ============================================================
   */
  const date = (x: string | null) =>
    x
      ? new Date(x).toLocaleString("es-CO", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Sin fecha";

  const relative = (x: string) => {
    const m = Math.floor(
      (Date.now() - new Date(x).getTime()) / 60000
    );

    if (m < 1) return "Ahora";

    if (m < 60) {
      return `Hace ${m} min`;
    }

    if (m < 1440) {
      return `Hace ${Math.floor(m / 60)} h`;
    }

    return date(x);
  };

  /*
   * ============================================================
   * AGRUPAR POR DÍA
   * ============================================================
   */
  const groups = useMemo(() => {
    const g: Record<string, Item[]> = {};

    items.forEach((x) => {
      const k = new Date(x.created_at).toLocaleDateString(
        "es-CO",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        }
      );

      (g[k] ??= []).push(x);
    });

    return g;
  }, [items]);

  /*
   * ============================================================
   * SELECCIÓN
   * ============================================================
   */

  /*
   * Todas las notificaciones actualmente visibles están
   * seleccionadas.
   */
  const todasSeleccionadas =
    items.length > 0 &&
    seleccionadas.length === items.length;

  /*
   * Seleccionar / deseleccionar una notificación.
   */
  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /*
   * Seleccionar o deseleccionar todas las notificaciones
   * que están visibles según los filtros actuales.
   */
  const toggleSeleccionarTodas = () => {
    if (todasSeleccionadas) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas(items.map((item) => item.id));
    }
  };

  /*
   * ============================================================
   * ELIMINAR SELECCIONADAS
   * ============================================================
   */
  const eliminarSeleccionadas = async () => {
    if (!seleccionadas.length) {
      return;
    }

    const cantidad = seleccionadas.length;

    const confirmar = confirm(
      `¿Deseas eliminar las ${cantidad} notificaciones seleccionadas?`
    );

    if (!confirmar) {
      return;
    }

    setEliminandoSeleccionadas(true);

    try {
      const t = await token();

      if (!t) {
        throw new Error("Sesión no disponible.");
      }

      /*
       * Guardamos una copia porque posteriormente
       * limpiaremos el estado de selección.
       */
      const ids = [...seleccionadas];

      /*
       * Utilizamos el mismo endpoint DELETE que ya utiliza
       * la eliminación individual.
       */
      const resultados = await Promise.all(
        ids.map((id) =>
          fetch(
            `/api/notificaciones?id=${encodeURIComponent(id)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${t}`,
              },
            }
          )
        )
      );

      /*
       * Si alguna eliminación falló, informamos al usuario.
       */
      const huboError = resultados.some(
        (response) => !response.ok
      );

      if (huboError) {
        throw new Error(
          "Algunas notificaciones no pudieron eliminarse."
        );
      }

      /*
       * Determinamos cuántas eliminadas estaban sin leer.
       */
      const eliminadas = items.filter((item) =>
        ids.includes(item.id)
      );

      const eliminadasNoLeidas = eliminadas.filter(
        (item) => !item.leida
      ).length;

      /*
       * Quitamos las notificaciones eliminadas
       * inmediatamente de la pantalla.
       */
      setItems((prev) =>
        prev.filter((item) => !ids.includes(item.id))
      );

      /*
       * Limpiamos la selección.
       */
      setSeleccionadas([]);

      /*
       * Actualizamos los indicadores superiores.
       */
      setSummary((prev) => ({
        ...prev,
        total: Math.max(
          0,
          prev.total - eliminadas.length
        ),
        no_leidas: Math.max(
          0,
          prev.no_leidas - eliminadasNoLeidas
        ),
      }));

      /*
       * Si el detalle abierto correspondía a una notificación
       * eliminada, cerramos el modal.
       */
      if (
        detail &&
        ids.includes(detail.id)
      ) {
        setDetail(null);
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "No fue posible eliminar las notificaciones seleccionadas."
      );
    } finally {
      setEliminandoSeleccionadas(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ======================================================
            ENCABEZADO
        ====================================================== */}

        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-5">

            <div className="flex gap-3 items-center">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                <Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Notificaciones y Alertas
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Centro unificado de pendientes, novedades y
                  próximos eventos del portal.
                </p>
              </div>
            </div>

            {/* BOTONES */}

            <div className="flex flex-wrap gap-2">

              <button
                onClick={() => load(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw
                  className={`h-4 w-4 inline mr-2 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Actualizar
              </button>

              <button
                onClick={markAll}
                disabled={!summary.no_leidas}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <CheckCheck className="h-4 w-4 inline mr-2" />
                Marcar todas leídas
              </button>

              {/* NUEVO BOTÓN DE ELIMINACIÓN MASIVA */}

              <button
                onClick={eliminarSeleccionadas}
                disabled={
                  seleccionadas.length === 0 ||
                  eliminandoSeleccionadas
                }
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {eliminandoSeleccionadas ? (
                  <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 inline mr-2" />
                )}

                Eliminar seleccionadas

                {seleccionadas.length > 0 &&
                  ` (${seleccionadas.length})`}
              </button>
            </div>
          </div>

          {/* ====================================================
              RESUMEN
          ==================================================== */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">

            {[
              ["Total", summary.total, "bg-slate-50 dark:bg-slate-800"],
              [
                "No leídas",
                summary.no_leidas,
                "bg-indigo-50 dark:bg-indigo-950/30",
              ],
              [
                "Pendientes",
                summary.pendientes,
                "bg-amber-50 dark:bg-amber-950/30",
              ],
              [
                "Próximas",
                summary.proximas,
                "bg-emerald-50 dark:bg-emerald-950/30",
              ],
            ].map(([a, b, c]) => (
              <div
                key={String(a)}
                className={`rounded-2xl ${c} p-4`}
              >
                <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                  {a}
                </div>

                <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {b}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================
            FILTROS
        ====================================================== */}

        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4">

          <div className="flex flex-col xl:flex-row gap-3">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título, mensaje, módulo o tipo..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-0 outline-none text-sm text-slate-900 dark:text-white"
              />

              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-0 text-sm text-slate-900 dark:text-white"
            >
              <option value="todas">Todas</option>
              <option value="no_leidas">No leídas</option>
              <option value="leidas">Leídas</option>
            </select>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-0 text-sm text-slate-900 dark:text-white"
            >
              <option value="todas">
                Todas las categorías
              </option>
              <option value="pendiente">
                Pendientes
              </option>
              <option value="proxima">
                Próximas
              </option>
              <option value="informativa">
                Informativas
              </option>
              <option value="completada">
                Completadas
              </option>
            </select>
          </div>

          {/* FILTRO POR MÓDULO */}

          <div className="flex gap-2 overflow-x-auto mt-3 pb-1">

            {[
              ["todos", "Todas"],
              ["flujos", "Flujos"],
              ["kanban", "Kanban"],
              ["agenda", "Agenda"],
              ["documentos", "Documentos"],
              ["sistema", "Sistema"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() =>
                  setModulo(id as Modulo)
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  modulo === id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ====================================================
              SELECCIÓN GENERAL
          ==================================================== */}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">

              <input
                type="checkbox"
                checked={todasSeleccionadas}
                onChange={toggleSeleccionarTodas}
                disabled={!items.length}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
              />

              {todasSeleccionadas
                ? "Deseleccionar todas"
                : "Seleccionar todas"}
            </label>

            {seleccionadas.length > 0 && (
              <div className="flex items-center gap-2">

                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {seleccionadas.length} seleccionada
                  {seleccionadas.length !== 1
                    ? "s"
                    : ""}
                </span>

                <button
                  onClick={() =>
                    setSeleccionadas([])
                  }
                  className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  Limpiar selección
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {/* ======================================================
            CONTENIDO
        ====================================================== */}

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 flex justify-center border border-slate-200 dark:border-slate-800">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !items.length ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-14 text-center">

            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />

            <h2 className="font-bold mt-4 text-slate-900 dark:text-white">
              No hay notificaciones
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              No encontramos avisos que coincidan con los filtros actuales.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {Object.entries(groups).map(
              ([day, list]) => (
                <section key={day}>

                  <div className="flex gap-2 items-center mb-2 px-1">
                    <Clock3 className="h-4 w-4 text-slate-400" />

                    <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {day}
                    </h2>
                  </div>

                  <div className="space-y-3">

                    {list.map((item) => {

                      const c =
                        cfg[item.modulo_origen] ||
                        cfg.sistema;

                      const Icon = c.icon;

                      const seleccionada =
                        seleccionadas.includes(item.id);

                      return (
                        <article
                          key={item.id}
                          className={`rounded-3xl border p-4 sm:p-5 transition ${
                            seleccionada
                              ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950"
                              : ""
                          } ${
                            item.leida
                              ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                              : c.soft
                          }`}
                        >

                          <div className="flex items-start gap-3">

                            {/* CHECKBOX */}

                            <div className="pt-1 shrink-0">

                              <input
                                type="checkbox"
                                checked={seleccionada}
                                onChange={() =>
                                  toggleSeleccion(
                                    item.id
                                  )
                                }
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                aria-label={`Seleccionar notificación ${item.titulo}`}
                              />
                            </div>

                            {/* ICONO */}

                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm shrink-0">

                              <Icon
                                className={`h-5 w-5 ${c.color}`}
                              />
                            </div>

                            {/* CONTENIDO */}

                            <button
                              onClick={() =>
                                open(item)
                              }
                              className="text-left flex-1 min-w-0"
                            >

                              <div
                                className={`text-[10px] uppercase font-bold ${c.color}`}
                              >
                                {c.label}
                              </div>

                              <h3 className="font-bold text-sm sm:text-base mt-1 text-slate-900 dark:text-white">
                                {item.titulo}
                              </h3>

                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 break-words">
                                {item.mensaje}
                              </p>

                              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400">

                                <span>
                                  {relative(
                                    item.created_at
                                  )}
                                </span>

                                {item.fecha_referencia && (
                                  <span>
                                    Fecha relacionada:{" "}
                                    {date(
                                      item.fecha_referencia
                                    )}
                                  </span>
                                )}

                                <span>
                                  {item.tipo.replaceAll(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </div>
                            </button>

                            {/* ACCIONES */}

                            <div className="flex gap-1 shrink-0">

                              <button
                                onClick={() =>
                                  open(item)
                                }
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                title="Abrir"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>

                              {!item.leida && (
                                <button
                                  onClick={() =>
                                    mark(item)
                                  }
                                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                  title="Marcar leída"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  remove(item)
                                }
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )
            )}
          </div>
        )}

        {/* ======================================================
            MODAL DE DETALLE
        ====================================================== */}

        {detail && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDetail(null)}
          >

            <div
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="flex justify-between gap-4">

                <div>

                  <div
                    className={`text-[10px] uppercase font-bold ${
                      cfg[detail.modulo_origen]
                        ?.color ||
                      cfg.sistema.color
                    }`}
                  >
                    {cfg[detail.modulo_origen]
                      ?.label || "Sistema"}
                  </div>

                  <h2 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">
                    {detail.titulo}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setDetail(null)
                  }
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 mt-5 text-sm whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">
                {detail.mensaje ||
                  "Sin información adicional."}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5 text-xs">

                <div>
                  <span className="text-slate-400">
                    Tipo
                  </span>

                  <strong className="block capitalize text-slate-800 dark:text-white">
                    {detail.tipo.replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400">
                    Fecha
                  </span>

                  <strong className="block text-slate-800 dark:text-white">
                    {date(detail.created_at)}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400">
                    Categoría
                  </span>

                  <strong className="block capitalize text-slate-800 dark:text-white">
                    {detail.categoria}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400">
                    Prioridad
                  </span>

                  <strong className="block capitalize text-slate-800 dark:text-white">
                    {detail.prioridad}
                  </strong>
                </div>
              </div>

              {detail.url && (
                <button
                  onClick={() =>
                    (window.location.href =
                      detail.url!)
                  }
                  className="w-full mt-6 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
                >
                  Ir al módulo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}