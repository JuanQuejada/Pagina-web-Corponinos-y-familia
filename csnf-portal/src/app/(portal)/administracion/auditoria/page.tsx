"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
  Database,
  Globe,
  Monitor,
  Hash,
} from "lucide-react";

/* ============================================================
   TIPOS
============================================================ */

interface UsuarioAuditoria {
  id: string | null;
  nombre: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
  email: string | null;
}

interface AuditoriaRegistro {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalles: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;

  usuario: UsuarioAuditoria;

  descripcion: string;
}

interface AuditoriaResponse {
  ok: boolean;
  data: AuditoriaRegistro[];
  total: number;
  acciones: string[];
  entidades: string[];
  error?: string;
  detalle?: string;
}

interface Filtros {
  busqueda: string;
  accion: string;
  entidad: string;
  usuario_id: string;
  desde: string;
  hasta: string;
}

const FILTROS_INICIALES: Filtros = {
  busqueda: "",
  accion: "",
  entidad: "",
  usuario_id: "",
  desde: "",
  hasta: "",
};

/* ============================================================
   UTILIDADES
============================================================ */

function texto(valor: unknown): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor).trim();
}

function normalizarAccion(
  valor: unknown
): string {
  return texto(valor).toUpperCase();
}

function normalizarEntidad(
  valor: unknown
): string {
  return texto(valor).toLowerCase();
}

function formatearFecha(
  valor: string | null | undefined
): string {
  if (!valor) {
    return "-";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(fecha);
}

function formatearFechaCorta(
  valor: string | null | undefined
): string {
  if (!valor) {
    return "-";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
    }
  ).format(fecha);
}

function obtenerIniciales(
  nombre: string
): string {
  const partes = nombre
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "U";
  }

  return partes
    .slice(0, 2)
    .map((parte) =>
      parte.charAt(0).toUpperCase()
    )
    .join("");
}

function formatearJson(
  valor: unknown
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (typeof valor === "string") {
    try {
      const parseado = JSON.parse(valor);

      return JSON.stringify(
        parseado,
        null,
        2
      );
    } catch {
      return valor;
    }
  }

  try {
    return JSON.stringify(
      valor,
      null,
      2
    );
  } catch {
    return String(valor);
  }
}

function obtenerEtiquetaAccion(
  accion: string
): string {
  const valor =
    normalizarAccion(accion);

  switch (valor) {
    case "INSERT":
      return "Creación";

    case "UPDATE":
      return "Actualización";

    case "DELETE":
      return "Eliminación";

    case "SELECT":
      return "Consulta";

    case "LOGIN":
      return "Inicio de sesión";

    case "LOGOUT":
      return "Cierre de sesión";

    default:
      return accion || "Operación";
  }
}

function obtenerClaseAccion(
  accion: string
): string {
  switch (
    normalizarAccion(accion)
  ) {
    case "INSERT":
      return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";

    case "UPDATE":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";

    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";

    case "LOGIN":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";

    case "LOGOUT":
      return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";

    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }
}

function obtenerIconoAccion(
  accion: string
) {
  switch (
    normalizarAccion(accion)
  ) {
    case "INSERT":
      return "＋";

    case "UPDATE":
      return "↻";

    case "DELETE":
      return "×";

    case "LOGIN":
      return "→";

    case "LOGOUT":
      return "←";

    default:
      return "•";
  }
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function AuditoriaPage() {
  const [registros, setRegistros] =
    useState<AuditoriaRegistro[]>([]);

  const [acciones, setAcciones] =
    useState<string[]>([]);

  const [entidades, setEntidades] =
    useState<string[]>([]);

  const [filtros, setFiltros] =
    useState<Filtros>(
      FILTROS_INICIALES
    );

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<AuditoriaRegistro | null>(
      null
    );

  const [mostrarFiltros, setMostrarFiltros] =
    useState(false);

  const [exportando, setExportando] =
    useState(false);

  const [pagina, setPagina] =
    useState(1);

  const [expandido, setExpandido] =
    useState<string | null>(null);

  const REGISTROS_POR_PAGINA = 50;

  /* ==========================================================
     CONSULTAR API
  ========================================================== */

  const cargarAuditoria = useCallback(
    async (
      mostrarLoader = true
    ) => {
      if (mostrarLoader) {
        setCargando(true);
      } else {
        setActualizando(true);
      }

      setError(null);

      try {
        const params =
          new URLSearchParams();

        if (filtros.busqueda.trim()) {
          params.set(
            "busqueda",
            filtros.busqueda.trim()
          );
        }

        if (filtros.accion) {
          params.set(
            "accion",
            filtros.accion
          );
        }

        if (filtros.entidad) {
          params.set(
            "entidad",
            filtros.entidad
          );
        }

        if (filtros.usuario_id) {
          params.set(
            "usuario_id",
            filtros.usuario_id
          );
        }

        if (filtros.desde) {
          params.set(
            "desde",
            filtros.desde
          );
        }

        if (filtros.hasta) {
          params.set(
            "hasta",
            filtros.hasta
          );
        }

        params.set(
          "limite",
          "1000"
        );

        const response =
          await fetch(
            `/api/auditoria?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        /*
         * No asumimos que el servidor
         * siempre devolverá JSON.
         *
         * Esto evita el clásico:
         * Unexpected token '<'
         */

        const contenido =
          await response.text();

        let data:
          | AuditoriaResponse
          | null = null;

        try {
          data =
            contenido
              ? JSON.parse(
                  contenido
                )
              : null;
        } catch {
          throw new Error(
            `El servidor respondió con un formato no válido (${response.status}).`
          );
        }

        if (
          !response.ok ||
          !data?.ok
        ) {
          throw new Error(
            data?.error ||
              `No fue posible consultar la auditoría (${response.status}).`
          );
        }

        const lista = Array.isArray(
          data.data
        )
          ? data.data
          : [];

        setRegistros(lista);

        setAcciones(
          Array.isArray(
            data.acciones
          )
            ? data.acciones
            : []
        );

        setEntidades(
          Array.isArray(
            data.entidades
          )
            ? data.entidades
            : []
        );

        setPagina(1);
      } catch (error: unknown) {
        console.error(
          "Error cargando auditoría:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar la auditoría."
        );

        setRegistros([]);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [filtros]
  );

  /* ==========================================================
     CARGA INICIAL
  ========================================================== */

  useEffect(() => {
    void cargarAuditoria(
      true
    );
  }, [cargarAuditoria]);

  /* ==========================================================
     FILTROS
  ========================================================== */

  const actualizarFiltro = (
    campo: keyof Filtros,
    valor: string
  ) => {
    setFiltros(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };

  const limpiarFiltros = () => {
    setFiltros(
      FILTROS_INICIALES
    );
    setPagina(1);
  };

  const filtrosActivos =
    Object.values(filtros).filter(
      Boolean
    ).length;

  /* ==========================================================
     ESTADÍSTICAS
  ========================================================== */

  const estadisticas =
    useMemo(() => {
      const total =
        registros.length;

      const creaciones =
        registros.filter(
          (registro) =>
            normalizarAccion(
              registro.accion
            ) === "INSERT"
        ).length;

      const actualizaciones =
        registros.filter(
          (registro) =>
            normalizarAccion(
              registro.accion
            ) === "UPDATE"
        ).length;

      const eliminaciones =
        registros.filter(
          (registro) =>
            normalizarAccion(
              registro.accion
            ) === "DELETE"
        ).length;

      return {
        total,
        creaciones,
        actualizaciones,
        eliminaciones,
      };
    }, [registros]);

  /* ==========================================================
     PAGINACIÓN
  ========================================================== */

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        registros.length /
          REGISTROS_POR_PAGINA
      )
    );

  const registrosPagina =
    useMemo(() => {
      const inicio =
        (pagina - 1) *
        REGISTROS_POR_PAGINA;

      return registros.slice(
        inicio,
        inicio +
          REGISTROS_POR_PAGINA
      );
    }, [registros, pagina]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  /* ==========================================================
     EXPORTAR
  ========================================================== */

  const exportarAuditoria =
    async () => {
      if (exportando) return;

      setExportando(true);

      try {
        const response =
          await fetch(
            "/api/auditoria/exportar?modulo=auditoria",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          const contenido =
            await response.text();

          let mensaje =
            "No fue posible exportar la auditoría.";

          try {
            const data =
              JSON.parse(
                contenido
              );

            mensaje =
              data?.error ||
              mensaje;
          } catch {
            // La respuesta no era JSON.
          }

          throw new Error(
            mensaje
          );
        }

        const blob =
          await response.blob();

        const url =
          window.URL.createObjectURL(
            blob
          );

        const enlace =
          document.createElement(
            "a"
          );

        enlace.href = url;

        enlace.download =
          `reporte_auditoria_sistema_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(
          enlace
        );

        enlace.click();

        enlace.remove();

        window.URL.revokeObjectURL(
          url
        );
      } catch (error: unknown) {
        console.error(
          "Error exportando auditoría:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "No fue posible exportar la auditoría."
        );
      } finally {
        setExportando(false);
      }
    };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-full p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ======================================================
          ENCABEZADO
      ======================================================= */}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Auditoría del Sistema
              </h1>

              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Registro de operaciones y actividad del sistema
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() =>
              void cargarAuditoria(
                false
              )
            }
            disabled={
              actualizando ||
              cargando
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {actualizando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            Actualizar
          </button>

          <button
            type="button"
            onClick={() =>
              void exportarAuditoria()
            }
            disabled={
              exportando
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}

            Exportar CSV
          </button>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              No fue posible completar la operación
            </p>

            <p className="text-xs text-red-700 dark:text-red-400 mt-1 break-words">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          ESTADÍSTICAS
      ======================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Registros
              </p>

              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {estadisticas.total}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Creaciones
              </p>

              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {estadisticas.creaciones}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/40">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Actualizaciones
              </p>

              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {estadisticas.actualizaciones}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <RefreshCw className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Eliminaciones
              </p>

              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {estadisticas.eliminaciones}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40">
              <Database className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================
          BÚSQUEDA
      ======================================================= */}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">

        <div className="p-4">

          <div className="flex flex-col lg:flex-row gap-3">

            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />

              <input
                type="text"
                value={
                  filtros.busqueda
                }
                onChange={(e) =>
                  actualizarFiltro(
                    "busqueda",
                    e.target.value
                  )
                }
                placeholder="Buscar por usuario, acción, entidad, descripción o ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarFiltros(
                  (valor) =>
                    !valor
                )
              }
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                mostrarFiltros ||
                filtrosActivos > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                  : "border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <Filter className="h-4 w-4" />

              Filtros

              {filtrosActivos >
                0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {filtrosActivos}
                </span>
              )}

              {mostrarFiltros ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

          </div>

          {mostrarFiltros && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">

                {/* ACCIÓN */}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Acción
                  </label>

                  <select
                    value={
                      filtros.accion
                    }
                    onChange={(e) =>
                      actualizarFiltro(
                        "accion",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      Todas las acciones
                    </option>

                    {acciones.map(
                      (
                        accion
                      ) => (
                        <option
                          key={accion}
                          value={accion}
                        >
                          {obtenerEtiquetaAccion(
                            accion
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* ENTIDAD */}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Entidad
                  </label>

                  <select
                    value={
                      filtros.entidad
                    }
                    onChange={(e) =>
                      actualizarFiltro(
                        "entidad",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      Todas las entidades
                    </option>

                    {entidades.map(
                      (
                        entidad
                      ) => (
                        <option
                          key={entidad}
                          value={entidad}
                        >
                          {entidad}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* USUARIO */}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Usuario ID
                  </label>

                  <input
                    type="text"
                    value={
                      filtros.usuario_id
                    }
                    onChange={(e) =>
                      actualizarFiltro(
                        "usuario_id",
                        e.target.value
                      )
                    }
                    placeholder="ID del usuario"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* DESDE */}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Desde
                  </label>

                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                    <input
                      type="date"
                      value={
                        filtros.desde
                      }
                      onChange={(e) =>
                        actualizarFiltro(
                          "desde",
                          e.target.value
                        )
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* HASTA */}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Hasta
                  </label>

                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                    <input
                      type="date"
                      value={
                        filtros.hasta
                      }
                      onChange={(e) =>
                        actualizarFiltro(
                          "hasta",
                          e.target.value
                        )
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-end mt-3">

                <button
                  type="button"
                  onClick={
                    limpiarFiltros
                  }
                  disabled={
                    filtrosActivos ===
                    0
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />

                  Limpiar filtros
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================
          TABLA
      ======================================================= */}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-3">
              Cargando registros de auditoría...
            </p>
          </div>
        ) : registros.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="p-4 rounded-2xl bg-gray-100 dark:bg-slate-800">
              <Database className="h-8 w-8 text-gray-400 dark:text-slate-500" />
            </div>

            <h3 className="mt-4 text-sm font-bold text-gray-700 dark:text-slate-300">
              No se encontraron registros
            </h3>

            <p className="mt-1 text-xs text-gray-400 text-center max-w-md">
              No existen registros de auditoría que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">

              <table className="w-full text-left border-collapse">

                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40">

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Fecha
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Usuario
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Acción
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Entidad
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Descripción
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">
                      Detalle
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">

                  {registrosPagina.map(
                    (
                      registro
                    ) => {
                      const abierto =
                        expandido ===
                        registro.id;

                      const usuario =
                        registro.usuario;

                      const nombreUsuario =
                        usuario?.nombre ||
                        "Sistema / Desconocido";

                      return (
                        <tr
                          key={
                            registro.id
                          }
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors align-top"
                        >

                          {/* FECHA */}

                          <td className="px-4 py-4 whitespace-nowrap">

                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />

                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                                  {formatearFechaCorta(
                                    registro.created_at
                                  )}
                                </p>

                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(
                                    registro.created_at
                                  ).toLocaleTimeString(
                                    "es-CO",
                                    {
                                      hour:
                                        "2-digit",
                                      minute:
                                        "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>

                          </td>

                          {/* USUARIO */}

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-2.5 min-w-[190px]">

                              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-100 dark:border-blue-900 shrink-0">
                                {obtenerIniciales(
                                  nombreUsuario
                                )}
                              </div>

                              <div className="min-w-0">

                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[220px]">
                                  {nombreUsuario}
                                </p>

                                {usuario?.email && (
                                  <p className="text-[10px] text-gray-400 truncate max-w-[220px] mt-0.5">
                                    {
                                      usuario.email
                                    }
                                  </p>
                                )}

                              </div>

                            </div>

                          </td>

                          {/* ACCIÓN */}

                          <td className="px-4 py-4 whitespace-nowrap">

                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${obtenerClaseAccion(
                                registro.accion
                              )}`}
                            >
                              <span className="text-sm leading-none">
                                {obtenerIconoAccion(
                                  registro.accion
                                )}
                              </span>

                              {
                                obtenerEtiquetaAccion(
                                  registro.accion
                                )
                              }
                            </span>

                            <p className="text-[9px] font-mono text-gray-400 mt-1">
                              {
                                registro.accion
                              }
                            </p>

                          </td>

                          {/* ENTIDAD */}

                          <td className="px-4 py-4">

                            <div className="min-w-[140px]">

                              <div className="flex items-center gap-1.5">

                                <Database className="h-3.5 w-3.5 text-gray-400" />

                                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                                  {registro.entidad ||
                                    "-"}
                                </span>

                              </div>

                              {registro.entidad_id && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Hash className="h-3 w-3 text-gray-400" />

                                  <span className="font-mono text-[9px] text-gray-400 truncate max-w-[150px]">
                                    {
                                      registro.entidad_id
                                    }
                                  </span>
                                </div>
                              )}

                            </div>

                          </td>

                          {/* DESCRIPCIÓN */}

                          <td className="px-4 py-4">

                            <p className="text-xs text-gray-700 dark:text-slate-300 max-w-[500px]">
                              {
                                registro.descripcion ||
                                "Sin descripción."
                              }
                            </p>

                          </td>

                          {/* DETALLE */}

                          <td className="px-4 py-4 text-center">

                            <button
                              type="button"
                              onClick={() =>
                                setExpandido(
                                  abierto
                                    ? null
                                    : registro.id
                                )
                              }
                              title={
                                abierto
                                  ? "Ocultar detalle"
                                  : "Mostrar detalle"
                              }
                              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                            >
                              {abierto ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* ==================================================
                DETALLES EXPANDIDOS
            =================================================== */}

            {expandido && (
              <div className="border-t border-gray-100 dark:border-slate-800">

                {(() => {
                  const registro =
                    registros.find(
                      (
                        item
                      ) =>
                        item.id ===
                        expandido
                    );

                  if (!registro) {
                    return null;
                  }

                  return (
                    <div className="p-5 bg-gray-50/70 dark:bg-slate-950/50">

                      <div className="flex items-center justify-between gap-3 mb-4">

                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />

                          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                            Detalle del registro
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setRegistroSeleccionado(
                              registro
                            )
                          }
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" />

                          Ver completo
                        </button>

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

                        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Registro
                          </p>

                          <p className="font-mono text-[10px] text-gray-700 dark:text-slate-300 mt-1 break-all">
                            {
                              registro.id
                            }
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Usuario ID
                          </p>

                          <p className="font-mono text-[10px] text-gray-700 dark:text-slate-300 mt-1 break-all">
                            {
                              registro.usuario_id ||
                              "-"
                            }
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Entidad ID
                          </p>

                          <p className="font-mono text-[10px] text-gray-700 dark:text-slate-300 mt-1 break-all">
                            {
                              registro.entidad_id ||
                              "-"
                            }
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Fecha y hora
                          </p>

                          <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                            {formatearFecha(
                              registro.created_at
                            )}
                          </p>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">

                        <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-blue-600" />

                            <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                              Descripción
                            </p>
                          </div>

                          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                            {
                              registro.descripcion ||
                              "Sin descripción."
                            }
                          </p>

                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-blue-600" />

                            <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                              Usuario
                            </p>
                          </div>

                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            {
                              registro.usuario
                                ?.nombre ||
                              "Sistema / Desconocido"
                            }
                          </p>

                          {registro.usuario
                            ?.email && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              {
                                registro.usuario.email
                              }
                            </p>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

            {/* ==================================================
                PAGINACIÓN
            =================================================== */}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-800">

              <p className="text-xs text-gray-400">
                Mostrando{" "}
                <span className="font-semibold text-gray-600 dark:text-slate-300">
                  {Math.min(
                    (pagina - 1) *
                      REGISTROS_POR_PAGINA +
                      1,
                    registros.length
                  )}
                </span>{" "}
                a{" "}
                <span className="font-semibold text-gray-600 dark:text-slate-300">
                  {Math.min(
                    pagina *
                      REGISTROS_POR_PAGINA,
                    registros.length
                  )}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-600 dark:text-slate-300">
                  {registros.length}
                </span>{" "}
                registros
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={
                    pagina <= 1
                  }
                  onClick={() =>
                    setPagina(
                      (valor) =>
                        Math.max(
                          1,
                          valor - 1
                        )
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Anterior
                </button>

                <span className="text-xs text-gray-500 dark:text-slate-400 px-2">
                  Página{" "}
                  <strong>
                    {pagina}
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {totalPaginas}
                  </strong>
                </span>

                <button
                  type="button"
                  disabled={
                    pagina >=
                    totalPaginas
                  }
                  onClick={() =>
                    setPagina(
                      (valor) =>
                        Math.min(
                          totalPaginas,
                          valor + 1
                        )
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Siguiente
                </button>

              </div>

            </div>
          </>
        )}

      </div>

      {/* ======================================================
          MODAL DETALLE COMPLETO
      ======================================================= */}

      {registroSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Registro de auditoría
                  </h2>

                  <p className="text-[10px] text-gray-400 font-mono">
                    {
                      registroSeleccionado.id
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRegistroSeleccionado(
                    null
                  )
                }
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="p-6 space-y-5">

              {/* RESUMEN */}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Acción
                  </p>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${obtenerClaseAccion(
                        registroSeleccionado.accion
                      )}`}
                    >
                      {
                        obtenerEtiquetaAccion(
                          registroSeleccionado.accion
                        )
                      }
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Entidad
                  </p>

                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-2">
                    {
                      registroSeleccionado.entidad ||
                      "-"
                    }
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Usuario
                  </p>

                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-2">
                    {
                      registroSeleccionado.usuario
                        ?.nombre ||
                      "Sistema / Desconocido"
                    }
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Fecha
                  </p>

                  <p className="text-xs text-gray-800 dark:text-slate-200 mt-2">
                    {formatearFecha(
                      registroSeleccionado.created_at
                    )}
                  </p>
                </div>

              </div>

              {/* DESCRIPCIÓN */}

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />

                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Descripción
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    {
                      registroSeleccionado.descripcion ||
                      "Sin descripción."
                    }
                  </p>
                </div>
              </section>

              {/* IDENTIFICADORES */}

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-blue-600" />

                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Identificadores
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      ID auditoría
                    </p>

                    <p className="font-mono text-[10px] break-all text-gray-700 dark:text-slate-300 mt-1">
                      {
                        registroSeleccionado.id
                      }
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      ID usuario
                    </p>

                    <p className="font-mono text-[10px] break-all text-gray-700 dark:text-slate-300 mt-1">
                      {
                        registroSeleccionado.usuario_id ||
                        "-"
                      }
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      ID entidad
                    </p>

                    <p className="font-mono text-[10px] break-all text-gray-700 dark:text-slate-300 mt-1">
                      {
                        registroSeleccionado.entidad_id ||
                        "-"
                      }
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      Operación
                    </p>

                    <p className="font-mono text-xs text-gray-700 dark:text-slate-300 mt-1">
                      {
                        registroSeleccionado.accion
                      }
                    </p>
                  </div>

                </div>
              </section>

              {/* CONEXIÓN */}

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-600" />

                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Información de conexión
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />

                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                        Dirección IP
                      </p>
                    </div>

                    <p className="font-mono text-xs text-gray-600 dark:text-slate-400 mt-2 break-all">
                      {
                        registroSeleccionado.ip_address ||
                        "No registrada"
                      }
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-gray-400" />

                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                        User Agent
                      </p>
                    </div>

                    <p className="text-[10px] text-gray-600 dark:text-slate-400 mt-2 break-all leading-relaxed">
                      {
                        registroSeleccionado.user_agent ||
                        "No registrado"
                      }
                    </p>
                  </div>

                </div>
              </section>

              {/* DETALLES JSON */}

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-600" />

                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Detalles técnicos
                  </h3>
                </div>

                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                  {formatearJson(
                    registroSeleccionado.detalles
                  ) ||
                    "Sin detalles registrados."}
                </pre>
              </section>

            </div>

            <div className="sticky bottom-0 flex justify-end px-6 py-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">

              <button
                type="button"
                onClick={() =>
                  setRegistroSeleccionado(
                    null
                  )
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}