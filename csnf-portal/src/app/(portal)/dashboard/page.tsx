"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TIPOS
========================================================= */

type AnyRecord = Record<string, any>;

type IconProps = {
  className?: string;
};

type QuickItem = {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  url?: string;
  visible?: boolean;
};

/* =========================================================
   ICONOS SVG LOCALES
   No usamos lucide-react para evitar problemas con chunks/cache.
========================================================= */

function Icon({
  name,
  className = "h-5 w-5",
}: IconProps & { name: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
        </svg>
      );

    case "sparkles":
      return (
        <svg {...common}>
          <path d="m12 3-1.2 3.7a2 2 0 0 1-1.3 1.3L5.8 9.2l3.7 1.2a2 2 0 0 1 1.3 1.3L12 15.4l1.2-3.7a2 2 0 0 1 1.3-1.3l3.7-1.2-3.7-1.2a2 2 0 0 1-1.3-1.3L12 3Z" />
          <path d="m19 15-.5 1.5a1 1 0 0 1-.7.7l-1.5.5 1.5.5a1 1 0 0 1 .7.7L19 20.4l.5-1.5a1 1 0 0 1 .7-.7l1.5-.5-1.5-.5a1 1 0 0 1-.7-.7L19 15Z" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      );

    case "send":
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 9h18" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h6" />
        </svg>
      );

    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "megaphone":
      return (
        <svg {...common}>
          <path d="M3 11v2a2 2 0 0 0 2 2h2l3 5h3l-2-5 8-3V7l-8-3H5a2 2 0 0 0-2 2v5Z" />
          <path d="M21 8v8" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

/* =========================================================
   UTILIDADES
========================================================= */

function formatDate(value: any) {
  if (!value) return "Sin fecha";

  try {
    return new Date(value).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Sin fecha";
  }
}

function priorityClass(value: any) {
  const priority = String(value || "").toLowerCase();

  if (priority === "alta") {
    return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300";
  }

  if (priority === "baja") {
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
}

function moduleClass(value: any) {
  const moduleName = String(value || "").toLowerCase();

  if (
    moduleName === "flujos" ||
    moduleName === "flujo" ||
    moduleName === "aprobaciones"
  ) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300";
  }

  if (
    moduleName === "kanban" ||
    moduleName === "tareas"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (
    moduleName === "agenda" ||
    moduleName === "eventos"
  ) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<AnyRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activityDetail, setActivityDetail] =
    useState<AnyRecord | null>(null);

  const [adsOpen, setAdsOpen] = useState(false);
  const [ads, setAds] = useState<AnyRecord[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [savingAd, setSavingAd] = useState(false);

  /* =========================================================
     HEADERS DE AUTENTICACIÓN
  ========================================================= */

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const sessionResult =
        await supabase.auth.getSession();

      const token =
        sessionResult.data.session?.access_token;

      if (!token) {
        return {};
      }

      return {
        Authorization: `Bearer ${token}`,
      };
    } catch {
      return {};
    }
  }, []);

  /* =========================================================
     CARGAR DASHBOARD
  ========================================================= */

  const loadDashboard = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/dashboard",
          {
            method: "GET",
            cache: "no-store",
            headers: await getHeaders(),
          },
        );

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.error ||
              "No fue posible cargar el Dashboard.",
          );
        }

        setDashboard(json.data || {});
      } catch (err: any) {
        setError(
          err?.message ||
            "Ocurrió un error cargando el Dashboard.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getHeaders],
  );

  /* =========================================================
     CARGAR ANUNCIOS ADMINISTRATIVOS
  ========================================================= */

  const loadAds = useCallback(async () => {
    if (!dashboard?.administracion?.visible) {
      return;
    }

    try {
      const response = await fetch(
        "/api/dashboard/anuncios",
        {
          method: "GET",
          cache: "no-store",
          headers: await getHeaders(),
        },
      );

      const json = await response.json();

      if (response.ok && json.success) {
        setAds(json.anuncios || []);
      }
    } catch {
      // No interrumpimos el Dashboard si falla la administración.
    }
  }, [
    dashboard?.administracion?.visible,
    getHeaders,
  ]);

  /* =========================================================
     EFECTOS
  ========================================================= */

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(() => {
      loadDashboard(true);
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  /* =========================================================
     DATOS DERIVADOS
  ========================================================= */

  const summary = dashboard?.resumen || {};

  const recentNotifications =
    dashboard?.notificaciones?.recientes || [];

  const pendingItems = useMemo(
    () => [
      {
        label: "Flujos pendientes",
        value: summary.flujos_pendientes,
        icon: "file",
        href: "/principal/flujo-aprobaciones",
        description:
          "Flujos que requieren tu atención",
      },
      {
        label: "Tareas pendientes",
        value: summary.tareas_pendientes,
        icon: "clipboard",
        href: "/principal/kanban",
        description:
          "Tareas asignadas por ejecutar",
      },
      {
        label: "Próximos eventos",
        value: summary.eventos_proximos,
        icon: "calendar",
        href: "/principal/eventos",
        description:
          "Actividades próximas",
      },
      {
        label: "Notificaciones",
        value: summary.notificaciones_pendientes,
        icon: "bell",
        href: "/principal/notificaciones-alertas",
        description:
          "Avisos pendientes de revisar",
      },
    ],
    [summary],
  );

  const attentionItems = useMemo(() => {
    const flows = (
      dashboard?.pendientes?.flujos || []
    ).map((item: AnyRecord) => ({
      ...item,
      moduleKey: "flujos",
      label: "Flujo de aprobación",
    }));

    const tasks = (
      dashboard?.pendientes?.tareas || []
    ).map((item: AnyRecord) => ({
      ...item,
      moduleKey: "kanban",
      label: "Kanban",
    }));

    const events = (
      dashboard?.pendientes?.eventos || []
    ).map((item: AnyRecord) => ({
      ...item,
      moduleKey: "agenda",
      label: "Agenda institucional",
    }));

    return [
      ...flows,
      ...tasks,
      ...events,
    ].slice(0, 8);
  }, [dashboard]);

  const upcomingItems = useMemo(() => {
    const today =
      dashboard?.proximos?.hoy || [];

    const tomorrow =
      dashboard?.proximos?.manana || [];

    return [
      ...today,
      ...tomorrow,
    ].slice(0, 8);
  }, [dashboard]);

  const quickAccess: QuickItem[] =
    dashboard?.accesos_rapidos || [];

  const visibleQuickAccess =
    quickAccess.filter(
      (item) => item.visible,
    );

  /* =========================================================
     GUARDAR ANUNCIO
  ========================================================= */

  const saveAnnouncement = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      return;
    }

    setSavingAd(true);

    try {
      const response = await fetch(
        "/api/dashboard/anuncios",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            ...(await getHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(editingId
              ? { id: editingId }
              : {}),
            titulo: cleanTitle,
            contenido: cleanContent,
            activo: true,
          }),
        },
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ||
            "No fue posible guardar el anuncio.",
        );
      }

      setTitle("");
      setContent("");
      setEditingId(null);

      await loadAds();
      await loadDashboard(true);
    } catch (err: any) {
      window.alert(
        err?.message ||
          "No fue posible guardar el anuncio.",
      );
    } finally {
      setSavingAd(false);
    }
  };

  /* =========================================================
     ELIMINAR ANUNCIO
  ========================================================= */

  const deleteAnnouncement = async (
    id: string,
  ) => {
    const confirmed = window.confirm(
      "¿Deseas eliminar este anuncio?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/dashboard/anuncios?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: await getHeaders(),
        },
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ||
            "No fue posible eliminar el anuncio.",
        );
      }

      await loadAds();
      await loadDashboard(true);
    } catch (err: any) {
      window.alert(
        err?.message ||
          "No fue posible eliminar el anuncio.",
      );
    }
  };

  /* =========================================================
     ACTIVAR / DESACTIVAR ANUNCIO
  ========================================================= */

  const toggleAnnouncement = async (
    announcement: AnyRecord,
  ) => {
    try {
      const response = await fetch(
        "/api/dashboard/anuncios",
        {
          method: "PATCH",
          headers: {
            ...(await getHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: announcement.id,
            activo: !announcement.activo,
          }),
        },
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ||
            "No fue posible actualizar el anuncio.",
        );
      }

      await loadAds();
      await loadDashboard(true);
    } catch (err: any) {
      window.alert(
        err?.message ||
          "No fue posible actualizar el anuncio.",
      );
    }
  };

  /* =========================================================
     EDITAR ANUNCIO
  ========================================================= */

  const editAnnouncement = (
    announcement: AnyRecord,
  ) => {
    setEditingId(announcement.id);
    setTitle(announcement.titulo || "");
    setContent(
      announcement.contenido || "",
    );
  };

  /* =========================================================
     ACCESO RÁPIDO
  ========================================================= */

  const scrollToQuickAccess = () => {
    document
      .getElementById("accesos-rapidos")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-[70vh] grid place-items-center px-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Icon
            name="refresh"
            className="h-5 w-5 animate-spin"
          />
          Cargando Dashboard...
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <h1 className="font-black">
            No fue posible cargar el Dashboard
          </h1>

          <p className="mt-2 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadDashboard()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <Icon
              name="refresh"
              className="h-4 w-4"
            />
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  const userName =
    dashboard?.usuario?.nombre
      ?.trim()
      ?.split(/\s+/)[0] ||
    "Usuario";

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">

      {/* =====================================================
          BIENVENIDA
      ===================================================== */}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">

        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-950/30" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="min-w-0">

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <Icon
                  name="sparkles"
                  className="h-4 w-4 text-indigo-500"
                />

                Centro de control institucional
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
                {dashboard?.saludo?.texto ||
                  "Bienvenido"}
                , {userName} 👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {dashboard?.saludo?.mensaje ||
                  "Consulta rápidamente la información y las actividades disponibles para ti."}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadDashboard(true)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Actualizar
            </button>

          </div>
        </article>

        <button
          type="button"
          onClick={scrollToQuickAccess}
          className="group relative flex min-h-[150px] items-center justify-between overflow-hidden rounded-3xl border border-indigo-200 bg-indigo-50 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-900 dark:bg-indigo-950/30"
        >
          <div>

            <div className="mb-3 inline-flex rounded-2xl border border-indigo-200 bg-white p-3 text-indigo-600 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">
              <Icon
                name="send"
                className="h-5 w-5"
              />
            </div>

            <h2 className="text-lg font-black text-indigo-950 dark:text-indigo-100">
              Accesos rápidos
            </h2>

            <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
              Ve directamente a las funciones principales del portal.
            </p>

          </div>

          <Icon
            name="arrow"
            className="h-6 w-6 shrink-0 text-indigo-500 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
          />
        </button>

      </section>

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">

        {pendingItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
          >
            <div className="flex items-center justify-between">

              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Icon
                  name={item.icon}
                  className="h-5 w-5"
                />
              </div>

              <Icon
                name="arrow"
                className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-slate-600"
              />

            </div>

            <div className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
              {Number(item.value) || 0}
            </div>

            <div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              {item.label}
            </div>

            <div className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              {item.description}
            </div>
          </Link>
        ))}

      </section>

      {/* =====================================================
          PENDIENTES / PRÓXIMAMENTE
      ===================================================== */}

      <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">

        {/* PENDIENTES */}

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <header className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                Pendientes de atención
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lo que requiere acción por tu parte.
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-500 dark:bg-indigo-950/40">
              <Icon
                name="activity"
                className="h-5 w-5"
              />
            </div>

          </header>

          <div className="space-y-3">

            {attentionItems.map(
              (item: AnyRecord) => (
                <Link
                  key={`${item.moduleKey}-${item.id}`}
                  href={
                    item.url ||
                    "/dashboard"
                  }
                  className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${moduleClass(
                    item.moduleKey,
                  )}`}
                >
                  <div className="flex justify-between gap-4">

                    <div className="min-w-0">

                      <div className="text-[10px] font-black uppercase tracking-wide">
                        {item.label}
                      </div>

                      <p className="mt-1 font-bold">
                        {item.titulo ||
                          item.nombre ||
                          "Actividad pendiente"}
                      </p>

                      <p className="mt-1 text-xs opacity-80">
                        {item.estado ||
                          item.fecha_vencimiento ||
                          formatDate(
                            item.fecha_inicio,
                          )}
                      </p>

                    </div>

                    <Icon
                      name="chevron"
                      className="h-5 w-5 shrink-0"
                    />

                  </div>
                </Link>
              ),
            )}

            {!attentionItems.length && (
              <div className="rounded-xl bg-emerald-50 p-6 text-center text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">

                <Icon
                  name="check"
                  className="mx-auto mb-2 h-7 w-7"
                />

                No tienes pendientes de atención.

              </div>
            )}

          </div>

        </article>

        {/* PRÓXIMAMENTE */}

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <header className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                Próximamente
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actividades cercanas.
              </p>
            </div>

            <div className="rounded-xl bg-cyan-50 p-2 text-cyan-500 dark:bg-cyan-950/30">
              <Icon
                name="clock"
                className="h-5 w-5"
              />
            </div>

          </header>

          <div className="space-y-2">

            {upcomingItems.map(
              (item: AnyRecord, index: number) => {
                const isEvent =
                  item.tipo === "evento";

                return (
                  <Link
                    key={`${item.id}-${index}`}
                    href={
                      item.url ||
                      "/dashboard"
                    }
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <div
                      className={`rounded-xl border p-2 ${
                        isEvent
                          ? moduleClass(
                              "agenda",
                            )
                          : moduleClass(
                              "kanban",
                            )
                      }`}
                    >
                      <Icon
                        name={
                          isEvent
                            ? "calendar"
                            : "clipboard"
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.titulo ||
                          item.nombre ||
                          "Actividad"}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.hora ||
                          "Durante el día"}
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold ${priorityClass(
                        item.prioridad,
                      )}`}
                    >
                      {item.prioridad ||
                        "media"}
                    </span>

                  </Link>
                );
              },
            )}

            {!upcomingItems.length && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                No hay actividades próximas.
              </div>
            )}

          </div>

        </article>

      </section>

      {/* =====================================================
          NOTIFICACIONES / ACTIVIDAD
      ===================================================== */}

      <section className="grid gap-8 lg:grid-cols-2">

        {/* NOTIFICACIONES */}

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <header className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                Notificaciones recientes
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Number(
                  dashboard?.notificaciones
                    ?.no_leidas,
                ) || 0}{" "}
                sin leer.
              </p>
            </div>

            <Link
              href="/principal/notificaciones-alertas"
              className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
            >
              Ver todas
            </Link>

          </header>

          {recentNotifications
            .slice(0, 7)
            .map((notification: AnyRecord) => (
              <Link
                key={`${notification.id}-${notification.modulo}`}
                href={
                  notification.url ||
                  "/principal/notificaciones-alertas"
                }
                className={`mb-2 flex gap-3 rounded-xl border p-3 transition hover:shadow-sm ${moduleClass(
                  notification.modulo,
                )}`}
              >
                <Icon
                  name="bell"
                  className="h-4 w-4 shrink-0"
                />

                <div className="min-w-0 flex-1">

                  <p className="text-sm font-bold">
                    {notification.titulo ||
                      "Notificación"}
                  </p>

                  <p className="line-clamp-2 text-xs opacity-80">
                    {notification.mensaje ||
                      ""}
                  </p>

                  <p className="text-[10px] opacity-60">
                    {formatDate(
                      notification.created_at,
                    )}
                  </p>

                </div>

                {!notification.leida && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current" />
                )}

              </Link>
            ))}

          {!recentNotifications.length && (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              No tienes notificaciones recientes.
            </div>
          )}

        </article>

        {/* ACTIVIDAD */}

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <header className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                Actividad reciente
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Últimos movimientos relacionados contigo.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Icon
                name="activity"
                className="h-5 w-5"
              />
            </div>

          </header>

          {(dashboard?.actividad_reciente ||
            [])
            .slice(0, 8)
            .map((activity: AnyRecord) => (
              <button
                key={activity.id}
                type="button"
                onClick={() =>
                  setActivityDetail(
                    activity,
                  )
                }
                className="mb-1 flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />

                <span className="min-w-0 flex-1">

                  <b className="block text-sm text-slate-800 dark:text-slate-100">
                    {activity.titulo ||
                      "Actividad"}
                  </b>

                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {activity.descripcion ||
                      ""}
                  </span>

                </span>

                <span className="shrink-0 text-[10px] text-slate-400">
                  {formatDate(
                    activity.fecha,
                  )}
                </span>

              </button>
            ))}

          {!dashboard?.actividad_reciente
            ?.length && (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              No hay actividad reciente.
            </div>
          )}

        </article>

      </section>

      {/* =====================================================
          ANUNCIOS
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <header className="mb-5 flex items-center justify-between">

          <div>
            <h2 className="font-black text-slate-950 dark:text-white">
              Anuncios institucionales
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comunicaciones activas.
            </p>
          </div>

          {dashboard?.administracion
            ?.visible && (
            <button
              type="button"
              onClick={() =>
                setAdsOpen(true)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Administrar
            </button>
          )}

        </header>

        <div className="grid gap-4 md:grid-cols-2">

          {(dashboard?.anuncios || [])
            .map((announcement: AnyRecord) => (
              <article
                key={announcement.id}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20"
              >
                <Icon
                  name="megaphone"
                  className="h-4 w-4 text-indigo-500"
                />

                <h3 className="mt-2 font-black text-slate-950 dark:text-white">
                  {announcement.titulo}
                </h3>

                <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                  {announcement.contenido}
                </p>

                <p className="mt-3 text-[10px] text-slate-400">
                  {formatDate(
                    announcement.created_at,
                  )}
                </p>
              </article>
            ))}

        </div>

        {!dashboard?.anuncios
          ?.length && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No hay anuncios activos.
          </p>
        )}

      </section>

      {/* =====================================================
          ACCESOS RÁPIDOS
      ===================================================== */}

      <section
        id="accesos-rapidos"
        className="scroll-mt-6 pt-2"
      >

        <header className="mb-4">
          <h2 className="font-black text-slate-950 dark:text-white">
            Accesos rápidos
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accede rápidamente a las funciones disponibles para ti.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">

          {visibleQuickAccess.map(
            (item) => (
              <Link
                key={
                  item.codigo ||
                  item.url ||
                  item.nombre
                }
                href={
                  item.url ||
                  "/dashboard"
                }
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
              >
                <Icon
                  name="send"
                  className="h-5 w-5 text-indigo-500"
                />

                <p className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">
                  {item.nombre ||
                    "Acceso"}
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {item.descripcion ||
                    ""}
                </p>
              </Link>
            ),
          )}

        </div>

        {!visibleQuickAccess.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No hay accesos rápidos disponibles.
          </div>
        )}

      </section>

      {/* =====================================================
          ADMINISTRACIÓN
      ===================================================== */}

      {dashboard?.administracion
        ?.visible && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <header className="flex items-center gap-3">

            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-500 dark:bg-indigo-950/40">
              <Icon
                name="shield"
                className="h-5 w-5"
              />
            </div>

            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                Administración
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disponible según tus permisos.
              </p>
            </div>

          </header>

          <div className="mt-4 grid gap-3 md:grid-cols-4">

            {[
              {
                label: "Usuarios",
                href: "/administracion/usuarios",
                icon: "users",
              },
              {
                label: "Roles y permisos",
                href: "/administracion/roles",
                icon: "shield",
              },
              {
                label: "Auditoría",
                href: "/administracion/auditoria",
                icon: "activity",
              },
              {
                label: "Configuración",
                href: "/administracion/configuracion",
                icon: "file",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Icon
                  name={item.icon}
                  className="h-5 w-5 text-slate-500 dark:text-slate-400"
                />

                <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {item.label}
                </p>
              </Link>
            ))}

          </div>

        </section>
      )}

      {/* =====================================================
          MODAL ACTIVIDAD
      ===================================================== */}

      {activityDetail && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() =>
            setActivityDetail(null)
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <header className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-300">
                  {activityDetail.modulo ||
                    "Actividad"}
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                  {activityDetail.titulo ||
                    "Actividad"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActivityDetail(null)
                }
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Icon
                  name="close"
                  className="h-5 w-5"
                />
              </button>

            </header>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {activityDetail.descripcion ||
                "Sin descripción."}
            </p>

            <p className="mt-4 text-xs text-slate-400">
              {formatDate(
                activityDetail.fecha,
              )}
            </p>

          </div>
        </div>
      )}

      {/* =====================================================
          MODAL ADMINISTRACIÓN ANUNCIOS
      ===================================================== */}

      {adsOpen &&
        dashboard?.administracion
          ?.visible && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">

            <div className="mx-auto mt-8 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">

              <header className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    Administrar anuncios
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Solo administradores.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAdsOpen(false)
                  }
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Icon
                    name="close"
                    className="h-5 w-5"
                  />
                </button>

              </header>

              <form
                onSubmit={saveAnnouncement}
                className="mt-5 grid gap-3 md:grid-cols-[1fr_2fr_auto]"
              >

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="Título del anuncio"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(
                      event.target.value,
                    )
                  }
                  placeholder="Contenido de la comunicación institucional"
                  rows={2}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={savingAd}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAd
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar"
                      : "Publicar"}
                </button>

              </form>

              <div className="mt-6 space-y-2">

                {ads.map(
                  (announcement) => (
                    <div
                      key={announcement.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >

                      <Icon
                        name="megaphone"
                        className="mt-1 h-4 w-4 shrink-0 text-indigo-500"
                      />

                      <div className="min-w-0 flex-1">

                        <b className="text-slate-950 dark:text-white">
                          {announcement.titulo}
                        </b>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {announcement.contenido}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleAnnouncement(
                            announcement,
                          )
                        }
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300"
                      >
                        {announcement.activo
                          ? "Ocultar"
                          : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editAnnouncement(
                            announcement,
                          )
                        }
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteAnnouncement(
                            announcement.id,
                          )
                        }
                        className="text-xs font-bold text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </button>

                    </div>
                  ),
                )}

                {!ads.length && (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    No hay anuncios registrados.
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

    </main>
  );
}