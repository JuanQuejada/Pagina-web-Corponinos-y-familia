"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Workflow,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const MINUTOS = [1, 2, 5, 10, 15, 30];

type DocRow = {
  id: string;

  documentos?: {
    id?: string | null;

    titulo?: string | null;
    descripcion?: string | null;

    fecha_documento?: string | null;

    codigo_flujo?: string | null;
    codigo_publicacion?: string | null;

    palabras_clave?: string | null;

    estado?: string | null;

    tipo_documento?: {
      id?: string | null;
      nombre?: string | null;
      codigo?: string | null;
    } | null;

    version_actual?: {
      id?: string | null;
      nombre_archivo?: string | null;
      mime_type?: string | null;
      tamano_bytes?: number | null;
      drive_url?: string | null;
    } | null;
  } | null;
};

/* ============================================================
   HELPERS
============================================================ */

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();

  const token = data.session?.access_token;

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatearFecha(valor?: string | null) {
  if (!valor) {
    return "—";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return fecha.toLocaleDateString("es-CO");
}

function obtenerOrigen(row: DocRow): "flujo" | "manual" {
  const codigoFlujo = row.documentos?.codigo_flujo?.trim();

  return codigoFlujo ? "flujo" : "manual";
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RepositorioPage() {
  /* ============================================================
     SEGURIDAD
  ============================================================ */

  const [autorizado, setAutorizado] = useState(false);

  const [clave, setClave] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* ============================================================
     DOCUMENTOS
  ============================================================ */

  const [docs, setDocs] = useState<DocRow[]>([]);

  /* ============================================================
     BLOQUEO
  ============================================================ */

  const [minutos, setMinutos] = useState(1);

  const [restante, setRestante] = useState(60);

  const [config, setConfig] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countdown = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const renewAt = useRef(0);

  /*
   * Esta referencia nos permite diferenciar:
   *
   * - bloqueo real por navegación
   * - desmontaje temporal provocado por React Strict Mode
   */
  const bloqueoPendiente = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /* ============================================================
     BUSCADOR
  ============================================================ */

  const [busqueda, setBusqueda] = useState("");

  const [filtroOrigen, setFiltroOrigen] = useState<
    "todos" | "flujo" | "manual"
  >("todos");

  /* ============================================================
     LIMPIAR TEMPORIZADORES
  ============================================================ */

  const limpiarTemporizadores = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (countdown.current) {
      clearInterval(countdown.current);
      countdown.current = null;
    }
  };

  /* ============================================================
     BLOQUEO LOCAL
  ============================================================ */

  const bloquearLocalmente = () => {
    limpiarTemporizadores();

    setAutorizado(false);

    setDocs([]);

    setBusqueda("");

    setClave("");

    setRestante(minutos * 60);
  };

  /* ============================================================
     BLOQUEO SERVIDOR
  ============================================================ */

  const bloquearServidor = () => {
    /*
     * No esperamos la respuesta porque esta función también
     * puede ejecutarse mientras abandonamos la página.
     */

    try {
      const payload = JSON.stringify({});

      /*
       * sendBeacon es preferible cuando el navegador está
       * abandonando la página.
       */
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([payload], {
          type: "application/json",
        });

        const enviado = navigator.sendBeacon(
          "/api/repositorios/bloquear",
          blob
        );

        if (enviado) {
          return;
        }
      }
    } catch (error) {
      console.warn(
        "No fue posible utilizar sendBeacon para bloquear:",
        error
      );
    }

    /*
     * Fallback para navegaciones donde todavía exista
     * oportunidad de realizar fetch.
     */
    try {
      void fetch("/api/repositorios/bloquear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadSeguro(),
        keepalive: true,
      });
    } catch (error) {
      console.warn(
        "No fue posible bloquear la sesión del repositorio:",
        error
      );
    }
  };

  function payloadSeguro() {
    return JSON.stringify({});
  }

  /* ============================================================
     BLOQUEAR COMPLETAMENTE
  ============================================================ */

  const bloquear = async () => {
    limpiarTemporizadores();

    bloquearLocalmente();

    try {
      await fetch("/api/repositorios/bloquear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        keepalive: true,
      });
    } catch (error) {
      console.warn(
        "No fue posible bloquear la sesión del repositorio:",
        error
      );
    }
  };

  /* ============================================================
     CARGAR DOCUMENTOS
  ============================================================ */

  const cargar = async () => {
    /*
     * MUY IMPORTANTE:
     *
     * Nunca debemos cargar documentos si el usuario no está
     * autorizado.
     *
     * Esta condición evita que una navegación o un montaje
     * vuelva a desbloquear automáticamente el módulo.
     */
    if (!autorizado) {
      return;
    }

    try {
      setError("");

      const res = await fetch(
        "/api/repositorios/documentos",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (res.status === 401 || res.status === 403) {
        bloquearLocalmente();

        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible cargar el repositorio."
        );
      }

      setDocs(
        Array.isArray(data.documentos)
          ? data.documentos
          : []
      );
    } catch (e: any) {
      setError(
        e?.message ||
          "No fue posible cargar el repositorio."
      );
    }
  };

  /* ============================================================
     RENOVAR SESIÓN
  ============================================================ */

  const renovarSesion = async () => {
    if (!autorizado) {
      return;
    }

    if (Date.now() < renewAt.current) {
      return;
    }

    renewAt.current = Date.now() + 60_000;

    try {
      const res = await fetch(
        "/api/repositorios/renovar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          keepalive: true,
        }
      );

      if (!res.ok) {
        bloquearLocalmente();
      }
    } catch (error) {
      console.warn(
        "Error renovando sesión privada:",
        error
      );

      bloquearLocalmente();
    }
  };

  /* ============================================================
     DESBLOQUEAR
  ============================================================ */

  const desbloquear = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);

    setError("");

    try {
      const headers = await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      const res = await fetch(
        "/api/repositorios/acceso",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            clave,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(
          body.error ||
            "No fue posible desbloquear el repositorio."
        );
      }

      /*
       * Solo aquí se concede acceso.
       *
       * Nunca al montar el componente.
       */
      setAutorizado(true);

      setClave("");

      setError("");

      /*
       * Después de autorizar, cargamos los documentos.
       */
      await cargarDespuesDeAutorizar();
    } catch (e: any) {
      setError(
        e?.message ||
          "No fue posible desbloquear el repositorio."
      );

      setAutorizado(false);

      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     CARGA DESPUÉS DE AUTORIZAR
  ============================================================ */

  const cargarDespuesDeAutorizar = async () => {
    try {
      const res = await fetch(
        "/api/repositorios/documentos",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (res.status === 401 || res.status === 403) {
        bloquearLocalmente();

        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible cargar el repositorio."
        );
      }

      setDocs(
        Array.isArray(data.documentos)
          ? data.documentos
          : []
      );
    } catch (e: any) {
      setError(
        e?.message ||
          "No fue posible cargar el repositorio."
      );

      setAutorizado(false);

      setDocs([]);
    }
  };

  /* ============================================================
     CONFIGURACIÓN INICIAL
  ============================================================ */

  useEffect(() => {
    /*
     * IMPORTANTE:
     *
     * Al entrar al módulo SIEMPRE iniciamos bloqueados.
     *
     * NO hacemos:
     *
     * fetch("/api/repositorios/documentos")
     * setAutorizado(true)
     *
     * porque eso era lo que provocaba el desbloqueo
     * automático al volver a la página.
     */
    const stored = Number(
      localStorage.getItem(
        "repositorio_inactividad_min"
      ) || 1
    );

    const valid = MINUTOS.includes(stored)
      ? stored
      : 1;

    setMinutos(valid);

    setRestante(valid * 60);

    setAutorizado(false);

    setDocs([]);
  }, []);

  /* ============================================================
     BLOQUEO AL CAMBIAR DE PESTAÑA
  ============================================================ */

  useEffect(() => {
    const manejarVisibilidad = () => {
      if (document.visibilityState === "hidden") {
        /*
         * Bloqueo INMEDIATO.
         */
        bloquearLocalmente();

        bloquearServidor();
      }
    };

    document.addEventListener(
      "visibilitychange",
      manejarVisibilidad
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        manejarVisibilidad
      );
    };
  }, [minutos]);

  /* ============================================================
     BLOQUEO AL ABANDONAR LA PÁGINA
  ============================================================ */

  useEffect(() => {
    /*
     * pagehide funciona cuando el navegador realmente
     * abandona la página.
     */
    const manejarPageHide = () => {
      bloquearLocalmente();

      bloquearServidor();
    };

    window.addEventListener(
      "pagehide",
      manejarPageHide
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        manejarPageHide
      );
    };
  }, [minutos]);

  /* ============================================================
     BLOQUEO AL DESMONTAR EL COMPONENTE
  ============================================================ */

  useEffect(() => {
    /*
     * Este mecanismo permite bloquear cuando Next.js
     * desmonta el módulo durante una navegación interna.
     *
     * Se utiliza un pequeño retraso para evitar que React
     * Strict Mode en desarrollo interprete su ciclo
     * de prueba como una navegación real.
     */
    return () => {
      if (bloqueoPendiente.current) {
        clearTimeout(bloqueoPendiente.current);
      }

      bloqueoPendiente.current = setTimeout(() => {
        bloquearLocalmente();

        bloquearServidor();

        bloqueoPendiente.current = null;
      }, 0);
    };
  }, []);

  /* ============================================================
   TEMPORIZADOR DE INACTIVIDAD
   ------------------------------------------------------------
   IMPORTANTE:
   El tiempo SOLO se reinicia mediante un CLICK dentro
   del módulo Repositorio.

   NO se reinicia por:
   - movimiento del mouse
   - scroll
   - teclado
   - touch/movimiento
============================================================ */

useEffect(() => {
  if (!autorizado) {
    limpiarTemporizadores();

    setRestante(minutos * 60);

    return;
  }

  const reiniciarPorClick = () => {
    /*
     * Cada click dentro del módulo representa una
     * interacción válida del usuario.
     */
    const total = minutos * 60;

    setRestante(total);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    if (countdown.current) {
      clearInterval(countdown.current);
    }

    /*
     * Renovamos la sesión únicamente cuando el usuario
     * realmente interactúa mediante un click.
     */
    void renovarSesion();

    /*
     * Nuevo temporizador de bloqueo.
     */
    timer.current = setTimeout(() => {
      void bloquear();
    }, total * 1000);

    /*
     * Contador visual.
     */
    countdown.current = setInterval(() => {
      setRestante((valor) => {
        if (valor <= 1) {
          return 0;
        }

        return valor - 1;
      });
    }, 1000);
  };

  /*
   * Capturamos solamente clicks realizados dentro
   * del documento.
   *
   * No escuchamos mousemove, scroll, keydown ni touchstart.
   */
  document.addEventListener(
    "click",
    reiniciarPorClick
  );

  /*
   * Iniciamos el contador al desbloquear el módulo.
   *
   * A partir de aquí el usuario tiene exactamente
   * "minutos" minutos para realizar un click.
   */
  const total = minutos * 60;

  setRestante(total);

  timer.current = setTimeout(() => {
    void bloquear();
  }, total * 1000);

  countdown.current = setInterval(() => {
    setRestante((valor) => {
      if (valor <= 1) {
        return 0;
      }

      return valor - 1;
    });
  }, 1000);

  return () => {
    document.removeEventListener(
      "click",
      reiniciarPorClick
    );

    limpiarTemporizadores();
  };
}, [autorizado, minutos]);

  /* ============================================================
     DESCARGAR / ABRIR DOCUMENTO
  ============================================================ */

  async function descargar(id: string) {
    const row = docs.find(
      (item) => item.id === id
    );

    /*
     * Los documentos publicados deben utilizar
     * preferentemente la URL propia de Google Drive.
     */
    const driveUrl =
      row?.documentos?.version_actual?.drive_url ||
      "";

    if (driveUrl) {
      window.open(
        driveUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    /*
     * Fallback para documentos antiguos que todavía
     * no tengan drive_url.
     */
    try {
      const headers = await authHeaders();

      const res = await fetch(
        `/api/repositorios/archivo?id=${encodeURIComponent(
          id
        )}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({}));

        alert(
          data.error ||
            "No fue posible descargar el documento."
        );

        return;
      }

      const blob = await res.blob();

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "";

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(
        error?.message ||
          "No fue posible descargar el documento."
      );
    }
  }

  /* ============================================================
     FILTRADO
  ============================================================ */

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);

    return docs.filter((row) => {
      const d = row.documentos;

      const texto = normalizar(
        [
          d?.titulo,
          d?.descripcion,
          d?.palabras_clave,
          d?.codigo_flujo,
          d?.codigo_publicacion,
          d?.fecha_documento,
          d?.estado,
          d?.tipo_documento?.nombre,
          d?.tipo_documento?.codigo,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const coincideBusqueda =
        !q || texto.includes(q);

      const coincideOrigen =
        filtroOrigen === "todos" ||
        obtenerOrigen(row) === filtroOrigen;

      return (
        coincideBusqueda &&
        coincideOrigen
      );
    });
  }, [
    docs,
    busqueda,
    filtroOrigen,
  ]);

  /* ============================================================
     CONTADOR
  ============================================================ */

  const mm = Math.floor(
    restante / 60
  );

  const ss = String(
    restante % 60
  ).padStart(2, "0");

  /* ============================================================
     PANTALLA BLOQUEADA
  ============================================================ */

  if (!autorizado) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <form
          onSubmit={desbloquear}
          className="w-full max-w-md space-y-5 rounded-3xl border bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="text-center">
            <Lock className="mx-auto h-10 w-10 text-indigo-600" />

            <h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              Repositorio Documental Privado
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Ingresa tu clave de seguridad
              independiente para acceder a la
              Bóveda Privada.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Clave de acceso
            </label>

            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                type="password"
                value={clave}
                onChange={(e) =>
                  setClave(e.target.value)
                }
                className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Ingresa tu clave"
                autoComplete="off"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}

            {loading
              ? "Verificando..."
              : "Desbloquear repositorio"}
          </button>
        </form>
      </main>
    );
  }

  /* ============================================================
     MÓDULO DESBLOQUEADO
  ============================================================ */

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ========================================================
          ENCABEZADO
      ======================================================== */}

      <header className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Lock className="h-6 w-6 text-indigo-600" />

              Repositorio Privado
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Bóveda privada de información
              autorizada.
            </p>

            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3 w-3" />

              Bloqueo por inactividad:

              <b className="text-slate-700 dark:text-slate-300">
                {mm}:{ss}
              </b>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void cargar()}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" />

              Actualizar
            </button>

            <button
              type="button"
              onClick={() => setConfig(true)}
              className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              Configurar
            </button>

            <button
              type="button"
              onClick={() => void bloquear()}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Lock className="mr-1 inline h-3.5 w-3.5" />

              Bloquear
            </button>
          </div>
        </div>

        {/* ======================================================
            BUSCADOR
        ====================================================== */}

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              type="search"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              placeholder="Buscar por título, descripción, palabras clave, código, tipo o fecha..."
              className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-10 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {busqueda && (
              <button
                type="button"
                onClick={() =>
                  setBusqueda("")
                }
                className="absolute right-3 top-2.5 text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ====================================================
              FILTRO ORIGEN
          ==================================================== */}

          <div className="flex rounded-xl border bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            {(
              [
                "todos",
                "flujo",
                "manual",
              ] as const
            ).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() =>
                  setFiltroOrigen(tipo)
                }
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  filtroOrigen === tipo
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {tipo === "todos"
                  ? "Todos"
                  : tipo === "flujo"
                  ? "Flujos"
                  : "Manuales"}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================
            CONTADOR RESULTADOS
        ====================================================== */}

        <div className="mt-3 flex justify-between text-[11px] text-slate-400">
          <span>
            {filtrados.length}{" "}
            {filtrados.length === 1
              ? "documento encontrado"
              : "documentos encontrados"}
          </span>

          {(busqueda ||
            filtroOrigen !== "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroOrigen("todos");
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </header>

      {/* ========================================================
          TARJETAS
      ======================================================== */}

      {filtrados.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2">
          {filtrados.map((row) => {
            const d = row.documentos;

            const v = d?.version_actual;

            const esFlujo =
              obtenerOrigen(row) ===
              "flujo";

            return (
              <article
                key={row.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                  esFlujo
                    ? "border-cyan-200 dark:border-cyan-900"
                    : "border-orange-200 dark:border-orange-900"
                }`}
              >
                {/* ==================================================
                    BARRA SUPERIOR DE COLOR
                ================================================== */}

                <div
                  className={`h-1.5 ${
                    esFlujo
                      ? "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"
                      : "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400"
                  }`}
                />

                <div className="space-y-4 p-5">
                  {/* ==================================================
                      CABECERA TARJETA
                  ================================================== */}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                          esFlujo
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
                            : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                        }`}
                      >
                        {esFlujo ? (
                          <Workflow className="h-3 w-3" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}

                        {esFlujo
                          ? "Publicado desde flujo"
                          : "Publicación manual"}
                      </span>

                      <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                        {d?.titulo ||
                          "Sin título"}
                      </h2>
                    </div>

                    <ShieldCheck
                      className={`h-5 w-5 ${
                        esFlujo
                          ? "text-cyan-500"
                          : "text-orange-500"
                      }`}
                    />
                  </div>

                  {/* ==================================================
                      DESCRIPCIÓN
                  ================================================== */}

                  <p className="line-clamp-3 text-xs leading-5 text-slate-500">
                    {d?.descripcion ||
                      "Sin descripción."}
                  </p>

                  {/* ==================================================
                      INFORMACIÓN
                  ================================================== */}

                  <div className="space-y-2 border-t pt-3 text-[10px] dark:border-slate-700">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">
                        Archivo
                      </span>

                      <span className="truncate text-right font-medium text-slate-600 dark:text-slate-300">
                        {v?.nombre_archivo ||
                          "Archivo"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">
                        Código
                      </span>

                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {d?.codigo_publicacion ||
                          d?.codigo_flujo ||
                          "—"}
                      </span>
                    </div>

                    {d?.tipo_documento && (
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Tag className="h-3.5 w-3.5" />

                          Tipo
                        </span>

                        <span className="text-right font-medium text-slate-600 dark:text-slate-300">
                          {d.tipo_documento
                            .codigo
                            ? `${d.tipo_documento.codigo} · `
                            : ""}

                          {d.tipo_documento
                            .nombre || "—"}
                        </span>
                      </div>
                    )}

                    {d?.fecha_documento && (
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1 text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5" />

                          Fecha
                        </span>

                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {formatearFecha(
                            d.fecha_documento
                          )}
                        </span>
                      </div>
                    )}

                    {d?.palabras_clave && (
                      <div className="flex flex-wrap gap-1">
                        {String(
                          d.palabras_clave
                        )
                          .split(/[;,]/)
                          .map((x) =>
                            x.trim()
                          )
                          .filter(Boolean)
                          .slice(0, 6)
                          .map((x) => (
                            <span
                              key={x}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            >
                              #{x}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* ==================================================
                      DESCARGA
                  ================================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      void descargar(row.id)
                    }
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                      esFlujo
                        ? "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-950/70"
                        : "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
                    }`}
                  >
                    <Download className="h-3.5 w-3.5" />

                    Descargar documento
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* ======================================================
           SIN RESULTADOS
        ====================================================== */

        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Search className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            {docs.length
              ? "No encontramos documentos con esos criterios."
              : "No hay documentos privados publicados."}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {docs.length
              ? "Prueba con otro título, código, tipo, palabra clave o fecha."
              : "Los documentos publicados en la Bóveda Privada aparecerán aquí."}
          </p>
        </div>
      )}

      {/* ========================================================
          MODAL CONFIGURACIÓN
      ======================================================== */}

      {config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Tiempo de bloqueo por inactividad
            </h3>

            <p className="text-xs text-slate-500">
              Este tiempo controla cuánto puede
              permanecer abierta la Bóveda Privada
              sin interacción.
            </p>

            {MINUTOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMinutos(m);

                  setRestante(m * 60);

                  localStorage.setItem(
                    "repositorio_inactividad_min",
                    String(m)
                  );

                  setConfig(false);
                }}
                className={`w-full rounded-xl px-4 py-2 text-left text-xs font-semibold transition ${
                  minutos === m
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {m}{" "}
                {m === 1
                  ? "minuto"
                  : "minutos"}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setConfig(false)
              }
              className="w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}