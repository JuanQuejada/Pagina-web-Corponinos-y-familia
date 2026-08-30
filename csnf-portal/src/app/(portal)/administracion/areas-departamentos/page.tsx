"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  FolderTree,
  Plus,
  Pencil,
  Eye,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  ListOrdered,
  Save,
  Power,
  Layers3,
} from "lucide-react";

interface Area {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number | null;
  activo: boolean | null;
  editable: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Departamento {
  id: string;
  area_id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean | null;
  editable: boolean;
  orden: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  area?: {
    id: string;
    codigo?: string | null;
    nombre: string;
    activo?: boolean | null;
  } | null;
}

type TabActiva = "areas" | "departamentos";

type TipoMensaje = "exito" | "error";

interface Mensaje {
  tipo: TipoMensaje;
  texto: string;
}

/**
 * Lee respuestas de las API de organización de forma segura.
 * Evita que una respuesta HTML (por ejemplo, un 404/405 del framework)
 * produzca el error genérico: Unexpected token '<' ... is not valid JSON.
 */
async function leerRespuestaJson(response: Response) {
  const texto = await response.text();

  if (!texto.trim()) {
    return {
      ok: false,
      error: `El servidor respondió sin contenido (HTTP ${response.status}).`,
    };
  }

  try {
    return JSON.parse(texto);
  } catch {
    console.error("Respuesta no JSON de la API:", texto.slice(0, 500));
    return {
      ok: false,
      error: `La API respondió con un formato inesperado (HTTP ${response.status}).`,
    };
  }
}

/**
 * Obtiene los encabezados de autenticación de la sesión actual.
 * Las operaciones protegidas de organización requieren el JWT
 * de Supabase en Authorization: Bearer <access_token>.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error obteniendo sesión:", error);
    return {};
  }

  const token = data.session?.access_token;

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export default function AreasDepartamentosPage() {
  // =========================================================
  // ESTADO GENERAL
  // =========================================================

  const [tabActiva, setTabActiva] =
    useState<TabActiva>("areas");

  const [areas, setAreas] = useState<Area[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(
    null
  );

  const [busqueda, setBusqueda] = useState("");

  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  // =========================================================
  // MODALES
  // =========================================================

  const [modalAreaOpen, setModalAreaOpen] = useState(false);
  const [modalDeptoOpen, setModalDeptoOpen] = useState(false);

  const [areaEditando, setAreaEditando] = useState<Area | null>(null);
  const [deptoEditando, setDeptoEditando] =
    useState<Departamento | null>(null);

  const [modoLectura, setModoLectura] = useState(false);

  // =========================================================
  // FORMULARIO ÁREA
  // =========================================================

  const [formArea, setFormArea] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    orden: 1,
    activo: true,
  });

  // =========================================================
  // FORMULARIO DEPARTAMENTO
  // =========================================================

  const [formDepto, setFormDepto] = useState({
    area_id: "",
    codigo: "",
    nombre: "",
    descripcion: "",
    orden: 1,
    activo: true,
  });

  // =========================================================
  // MENSAJES
  // =========================================================

  const mostrarMensaje = (
    tipo: TipoMensaje,
    texto: string
  ) => {
    setMensaje({
      tipo,
      texto,
    });

    window.setTimeout(() => {
      setMensaje(null);
    }, 4000);
  };

  // =========================================================
  // CARGAR ÁREAS
  // =========================================================

  const cargarAreas = async () => {
    const response = await fetch(
      "/api/organizacion/areas",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const resultado = await leerRespuestaJson(response);

    if (!response.ok || !resultado.ok) {
      throw new Error(
        resultado.error ||
          "No se pudieron cargar las áreas."
      );
    }

    setAreas(resultado.data || []);
  };

  // =========================================================
  // CARGAR DEPARTAMENTOS
  // =========================================================

  const cargarDepartamentos = async () => {
    const response = await fetch(
      "/api/organizacion/departamentos",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const resultado = await leerRespuestaJson(response);

    if (!response.ok || !resultado.ok) {
      throw new Error(
        resultado.error ||
          "No se pudieron cargar los departamentos."
      );
    }

    setDepartamentos(resultado.data || []);
  };

  // =========================================================
  // CARGAR TODO
  // =========================================================

  const cargarDatos = async () => {
    setCargando(true);

    try {
      await Promise.all([
        cargarAreas(),
        cargarDepartamentos(),
      ]);
    } catch (error: any) {
      console.error("Error cargando organización:", error);

      mostrarMensaje(
        "error",
        error.message ||
          "No se pudo cargar la información."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // =========================================================
  // FILTROS
  // =========================================================

  const areasFiltradas = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLowerCase();

    if (!termino) {
      return areas;
    }

    return areas.filter((area) => {
      return (
        area.nombre
          .toLowerCase()
          .includes(termino) ||
        area.codigo
          ?.toLowerCase()
          .includes(termino) ||
        area.descripcion
          ?.toLowerCase()
          .includes(termino)
      );
    });
  }, [areas, busqueda]);

  const departamentosFiltrados = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLowerCase();

    if (!termino) {
      return departamentos;
    }

    return departamentos.filter((depto) => {
      return (
        depto.nombre
          .toLowerCase()
          .includes(termino) ||
        depto.codigo
          ?.toLowerCase()
          .includes(termino) ||
        depto.descripcion
          ?.toLowerCase()
          .includes(termino) ||
        depto.area?.nombre
          ?.toLowerCase()
          .includes(termino)
      );
    });
  }, [departamentos, busqueda]);

  // =========================================================
  // MODAL ÁREA
  // =========================================================

  const abrirModalArea = (
    area?: Area,
    lectura = false
  ) => {
    setModoLectura(lectura);

    if (area) {
      setAreaEditando(area);

      setFormArea({
        codigo: area.codigo || "",
        nombre: area.nombre || "",
        descripcion: area.descripcion || "",
        orden: area.orden || 1,
        activo: area.activo ?? true,
      });
    } else {
      setAreaEditando(null);

      setFormArea({
        codigo: "",
        nombre: "",
        descripcion: "",
        orden: areas.length + 1,
        activo: true,
      });
    }

    setModalAreaOpen(true);
  };

  // =========================================================
  // CREAR / EDITAR ÁREA
  // =========================================================

  const guardarArea = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (modoLectura) {
      return;
    }

    if (!formArea.nombre.trim()) {
      mostrarMensaje(
        "error",
        "El nombre del área es obligatorio."
      );
      return;
    }

    setGuardando(true);

    try {
      const headers = await authHeaders();

      if (!headers.Authorization) {
        throw new Error("No hay una sesión autenticada.");
      }

      const payload = {
        codigo:
          formArea.codigo.trim() || null,

        nombre:
          formArea.nombre.trim(),

        descripcion:
          formArea.descripcion.trim() || null,

        orden:
          Number(formArea.orden) || 1,

        activo:
          formArea.activo,
      };

      let response: Response;

      if (areaEditando) {
        response = await fetch(
          `/api/organizacion/areas/${areaEditando.id}`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          "/api/organizacion/areas",
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const resultado = await leerRespuestaJson(response);

      if (!response.ok || !resultado.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo guardar el área."
        );
      }

      mostrarMensaje(
        "exito",
        resultado.mensaje ||
          (areaEditando
            ? "Área actualizada correctamente."
            : "Área creada correctamente.")
      );

      setModalAreaOpen(false);

      await cargarAreas();
      await cargarDepartamentos();
    } catch (error: any) {
      console.error(error);

      mostrarMensaje(
        "error",
        error.message ||
          "Ocurrió un error al guardar el área."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // CAMBIAR ESTADO ÁREA
  // =========================================================

  const alternarEstadoArea = async (
    area: Area
  ) => {
    setCambiandoEstado(area.id);

    try {
      const headers = await authHeaders();

      if (!headers.Authorization) {
        throw new Error("No hay una sesión autenticada.");
      }

      const response = await fetch(
        `/api/organizacion/areas/${area.id}/estado`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            activo: !area.activo,
          }),
        }
      );

      const resultado = await leerRespuestaJson(response);

      if (!response.ok || !resultado.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo cambiar el estado."
        );
      }

      mostrarMensaje(
        "exito",
        resultado.mensaje ||
          `Área ${
            !area.activo
              ? "activada"
              : "desactivada"
          } correctamente.`
      );

      await cargarAreas();
      await cargarDepartamentos();
    } catch (error: any) {
      console.error(error);

      mostrarMensaje(
        "error",
        error.message ||
          "No se pudo cambiar el estado del área."
      );
    } finally {
      setCambiandoEstado(null);
    }
  };

  // =========================================================
  // MODAL DEPARTAMENTO
  // =========================================================

  const abrirModalDepto = (
    depto?: Departamento,
    lectura = false
  ) => {
    setModoLectura(lectura);

    if (depto) {
      setDeptoEditando(depto);

      setFormDepto({
        area_id: depto.area_id || "",
        codigo: depto.codigo || "",
        nombre: depto.nombre || "",
        descripcion:
          depto.descripcion || "",
        orden: depto.orden || 1,
        activo: depto.activo ?? true,
      });
    } else {
      setDeptoEditando(null);

      const primeraAreaActiva =
        areas.find((area) => area.activo);

      setFormDepto({
        area_id:
          primeraAreaActiva?.id || "",

        codigo: "",
        nombre: "",
        descripcion: "",
        orden: departamentos.length + 1,
        activo: true,
      });
    }

    setModalDeptoOpen(true);
  };

  // =========================================================
  // CREAR / EDITAR DEPARTAMENTO
  // =========================================================

  const guardarDepto = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (modoLectura) {
      return;
    }

    if (!formDepto.area_id) {
      mostrarMensaje(
        "error",
        "Debe seleccionar un área."
      );
      return;
    }

    if (!formDepto.nombre.trim()) {
      mostrarMensaje(
        "error",
        "El nombre del departamento es obligatorio."
      );
      return;
    }

    setGuardando(true);

    try {
      const headers = await authHeaders();

      if (!headers.Authorization) {
        throw new Error("No hay una sesión autenticada.");
      }

      const payload = {
        area_id:
          formDepto.area_id,

        codigo:
          formDepto.codigo.trim() || null,

        nombre:
          formDepto.nombre.trim(),

        descripcion:
          formDepto.descripcion.trim() ||
          null,

        orden:
          Number(formDepto.orden) || 1,

        activo:
          formDepto.activo,
      };

      let response: Response;

      if (deptoEditando) {
        response = await fetch(
          `/api/organizacion/departamentos/${deptoEditando.id}`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          "/api/organizacion/departamentos",
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const resultado = await leerRespuestaJson(response);

      if (!response.ok || !resultado.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo guardar el departamento."
        );
      }

      mostrarMensaje(
        "exito",
        resultado.mensaje ||
          (deptoEditando
            ? "Departamento actualizado correctamente."
            : "Departamento creado correctamente.")
      );

      setModalDeptoOpen(false);

      await cargarDepartamentos();
    } catch (error: any) {
      console.error(error);

      mostrarMensaje(
        "error",
        error.message ||
          "Ocurrió un error al guardar el departamento."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // CAMBIAR ESTADO DEPARTAMENTO
  // =========================================================

  const alternarEstadoDepto = async (
    depto: Departamento
  ) => {
    setCambiandoEstado(depto.id);

    try {
      const headers = await authHeaders();

      if (!headers.Authorization) {
        throw new Error("No hay una sesión autenticada.");
      }

      const response = await fetch(
        `/api/organizacion/departamentos/${depto.id}/estado`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            activo: !depto.activo,
          }),
        }
      );

      const resultado = await leerRespuestaJson(response);

      if (!response.ok || !resultado.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo cambiar el estado."
        );
      }

      mostrarMensaje(
        "exito",
        resultado.mensaje ||
          `Departamento ${
            !depto.activo
              ? "activado"
              : "desactivado"
          } correctamente.`
      );

      await cargarDepartamentos();
    } catch (error: any) {
      console.error(error);

      mostrarMensaje(
        "error",
        error.message ||
          "No se pudo cambiar el estado."
      );
    } finally {
      setCambiandoEstado(null);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-violet-600/5" />

          <div className="relative p-6 md:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Building2 className="h-6 w-6 text-white" />
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Áreas y Departamentos
                  </h1>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Administración de la estructura organizacional
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  tabActiva === "areas"
                    ? abrirModalArea()
                    : abrirModalDepto()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25"
              >
                <Plus className="h-4 w-4" />

                {tabActiva === "areas"
                  ? "Nueva Área"
                  : "Nuevo Departamento"}
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            MENSAJE
        ====================================================== */}

        {mensaje && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm ${
              mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            {mensaje.tipo === "exito" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}

            <span>{mensaje.texto}</span>

            <button
              onClick={() =>
                setMensaje(null)
              }
              className="ml-auto rounded-lg p-1 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =====================================================
            RESUMEN
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Áreas
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {areas.length}
                </p>
              </div>

              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Departamentos
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {departamentos.length}
                </p>
              </div>

              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Estructura
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  Organización activa
                </p>
              </div>

              <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                <Layers3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            TABS + BUSCADOR
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4">

            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">

              <button
                onClick={() => {
                  setTabActiva("areas");
                  setBusqueda("");
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tabActiva === "areas"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Building2 className="h-4 w-4" />

                Áreas

                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                  {areas.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setTabActiva("departamentos");
                  setBusqueda("");
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tabActiva === "departamentos"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <FolderTree className="h-4 w-4" />

                Departamentos

                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                  {departamentos.length}
                </span>
              </button>

            </div>

            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />

              <input
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder={
                  tabActiva === "areas"
                    ? "Buscar área..."
                    : "Buscar departamento..."
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

          </div>
        </div>

        {/* =====================================================
            CONTENIDO
        ====================================================== */}

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

            <p className="mt-3 text-sm text-slate-500">
              Cargando estructura organizacional...
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                TAB ÁREAS
            ================================================== */}

            {tabActiva === "areas" && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Código
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Área
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Descripción
                        </th>

                        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                          Orden
                        </th>

                        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                          Estado
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                      {areasFiltradas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-16 text-center"
                          >
                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                              No se encontraron áreas
                            </p>
                          </td>
                        </tr>
                      ) : (
                        areasFiltradas.map(
                          (area) => (
                            <tr
                              key={area.id}
                              className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                  {area.codigo || "-"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-bold text-sm text-slate-900 dark:text-white">
                                  {area.nombre}
                                </div>
                              </td>

                              <td className="px-5 py-4 max-w-md">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {area.descripcion || "Sin descripción"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                  {area.orden ?? "-"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                    area.activo
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      area.activo
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />

                                  {area.activo
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end items-center gap-1">

                                  <button
                                    onClick={() =>
                                      abrirModalArea(
                                        area,
                                        true
                                      )
                                    }
                                    title="Visualizar"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      abrirModalArea(
                                        area,
                                        false
                                      )
                                    }
                                    title="Editar"
                                    disabled={
                                      area.editable === false
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-800 dark:hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      alternarEstadoArea(
                                        area
                                      )
                                    }
                                    title={
                                      area.editable === false
                                        ? "Área protegida"
                                        : area.activo
                                        ? "Desactivar"
                                        : "Activar"
                                    }
                                    disabled={
                                      area.editable === false ||
                                      cambiandoEstado === area.id
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-50"
                                  >
                                    {cambiandoEstado ===
                                    area.id ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : area.activo ? (
                                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                      <ToggleLeft className="h-5 w-5" />
                                    )}
                                  </button>

                                </div>
                              </td>
                            </tr>
                          )
                        )
                      )}

                    </tbody>
                  </table>

                </div>
              </div>
            )}

            {/* =================================================
                TAB DEPARTAMENTOS
            ================================================== */}

            {tabActiva === "departamentos" && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-left">

                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Código
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Departamento
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Área
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Descripción
                        </th>

                        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                          Estado
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                          Acciones
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                      {departamentosFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-16 text-center"
                          >
                            <FolderTree className="mx-auto h-10 w-10 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                              No se encontraron departamentos
                            </p>
                          </td>
                        </tr>
                      ) : (
                        departamentosFiltrados.map(
                          (depto) => (
                            <tr
                              key={depto.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                  {depto.codigo || "-"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-bold text-sm text-slate-900 dark:text-white">
                                  {depto.nombre}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  Orden {depto.orden ?? "-"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                                  <Building2 className="h-3.5 w-3.5" />

                                  {depto.area?.nombre ||
                                    "Sin asignar"}
                                </span>
                              </td>

                              <td className="px-5 py-4 max-w-md">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {depto.descripcion ||
                                    "Sin descripción"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">

                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                    depto.activo
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      depto.activo
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />

                                  {depto.activo
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>

                              </td>

                              <td className="px-5 py-4">

                                <div className="flex justify-end items-center gap-1">

                                  <button
                                    onClick={() =>
                                      abrirModalDepto(
                                        depto,
                                        true
                                      )
                                    }
                                    title="Visualizar"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      abrirModalDepto(
                                        depto,
                                        false
                                      )
                                    }
                                    title="Editar"
                                    disabled={
                                      depto.editable === false
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-800 dark:hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      alternarEstadoDepto(
                                        depto
                                      )
                                    }
                                    title={
                                      depto.editable === false
                                        ? "Departamento protegido"
                                        : depto.activo
                                        ? "Desactivar"
                                        : "Activar"
                                    }
                                    disabled={
                                      depto.editable === false ||
                                      cambiandoEstado === depto.id
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-50"
                                  >
                                    {cambiandoEstado ===
                                    depto.id ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : depto.activo ? (
                                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                      <ToggleLeft className="h-5 w-5" />
                                    )}
                                  </button>

                                </div>

                              </td>

                            </tr>
                          )
                        )
                      )}

                    </tbody>
                  </table>

                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* =======================================================
          MODAL ÁREA
      ======================================================== */}

      {modalAreaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg">
                      {modoLectura
                        ? "Detalle del Área"
                        : areaEditando
                        ? "Editar Área"
                        : "Nueva Área"}
                    </h3>

                    <p className="text-xs text-blue-100">
                      Estructura organizacional
                    </p>
                  </div>

                </div>

                <button
                  onClick={() =>
                    setModalAreaOpen(false)
                  }
                  className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>
            </div>

            <form
              onSubmit={guardarArea}
              className="p-6 space-y-5"
            >

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Hash className="h-3.5 w-3.5 text-blue-500" />
                    Código
                  </label>

                  <input
                    type="text"
                    value={formArea.codigo}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormArea({
                        ...formArea,
                        codigo:
                          e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="DIR-EJ"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">

                  <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Nombre del Área *
                  </label>

                  <input
                    type="text"
                    required
                    value={formArea.nombre}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormArea({
                        ...formArea,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Ej. Área Financiera"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Descripción
                </label>

                <textarea
                  rows={4}
                  value={formArea.descripcion}
                  disabled={modoLectura}
                  onChange={(e) =>
                    setFormArea({
                      ...formArea,
                      descripcion:
                        e.target.value,
                    })
                  }
                  placeholder="Descripción general del área..."
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <ListOrdered className="h-3.5 w-3.5 text-blue-500" />
                    Orden
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={formArea.orden}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormArea({
                        ...formArea,
                        orden:
                          Number(
                            e.target.value
                          ) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                </div>

                <div className="flex items-end">

                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3">

                    <input
                      type="checkbox"
                      checked={formArea.activo}
                      disabled={modoLectura}
                      onChange={(e) =>
                        setFormArea({
                          ...formArea,
                          activo:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />

                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Área activa
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Disponible para asignaciones
                      </p>
                    </div>

                  </label>

                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setModalAreaOpen(false)
                  }
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {modoLectura
                    ? "Cerrar"
                    : "Cancelar"}
                </button>

                {!modoLectura && (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >

                    {guardando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {areaEditando
                      ? "Guardar cambios"
                      : "Crear área"}

                  </button>
                )}

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =======================================================
          MODAL DEPARTAMENTO
      ======================================================== */}

      {modalDeptoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">

            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <FolderTree className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg">
                      {modoLectura
                        ? "Detalle del Departamento"
                        : deptoEditando
                        ? "Editar Departamento"
                        : "Nuevo Departamento"}
                    </h3>

                    <p className="text-xs text-indigo-100">
                      Organización interna
                    </p>
                  </div>

                </div>

                <button
                  onClick={() =>
                    setModalDeptoOpen(false)
                  }
                  className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>
            </div>

            <form
              onSubmit={guardarDepto}
              className="p-6 space-y-5"
            >

              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Área a la que pertenece *
                </label>

                <select
                  required
                  value={formDepto.area_id}
                  disabled={modoLectura}
                  onChange={(e) =>
                    setFormDepto({
                      ...formDepto,
                      area_id:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                >

                  <option value="">
                    -- Seleccione un Área --
                  </option>

                  {areas
                    .filter(
                      (area) =>
                        area.activo ||
                        area.id ===
                          formDepto.area_id
                    )
                    .map((area) => (
                      <option
                        key={area.id}
                        value={area.id}
                      >
                        {area.codigo
                          ? `${area.codigo} — `
                          : ""}
                        {area.nombre}
                      </option>
                    ))}

                </select>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>

                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Hash className="h-3.5 w-3.5 text-indigo-500" />
                    Código
                  </label>

                  <input
                    type="text"
                    value={formDepto.codigo}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormDepto({
                        ...formDepto,
                        codigo:
                          e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="DEP-SIS"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                  />

                </div>

                <div className="md:col-span-2">

                  <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Nombre del Departamento *
                  </label>

                  <input
                    type="text"
                    required
                    value={formDepto.nombre}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormDepto({
                        ...formDepto,
                        nombre:
                          e.target.value,
                      })
                    }
                    placeholder="Ej. Departamento de Sistemas"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                  />

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Descripción
                </label>

                <textarea
                  rows={4}
                  value={formDepto.descripcion}
                  disabled={modoLectura}
                  onChange={(e) =>
                    setFormDepto({
                      ...formDepto,
                      descripcion:
                        e.target.value,
                    })
                  }
                  placeholder="Funciones principales del departamento..."
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <ListOrdered className="h-3.5 w-3.5 text-indigo-500" />
                    Orden
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={formDepto.orden}
                    disabled={modoLectura}
                    onChange={(e) =>
                      setFormDepto({
                        ...formDepto,
                        orden:
                          Number(
                            e.target.value
                          ) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                  />

                </div>

                <div className="flex items-end">

                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3">

                    <input
                      type="checkbox"
                      checked={formDepto.activo}
                      disabled={
                        modoLectura ||
                        !areas.find((area) => area.id === formDepto.area_id)?.activo
                      }
                      onChange={(e) =>
                        setFormDepto({
                          ...formDepto,
                          activo:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />

                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Departamento activo
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Disponible en la estructura
                      </p>
                    </div>

                  </label>

                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setModalDeptoOpen(false)
                  }
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {modoLectura
                    ? "Cerrar"
                    : "Cancelar"}
                </button>

                {!modoLectura && (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >

                    {guardando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {deptoEditando
                      ? "Guardar cambios"
                      : "Crear departamento"}

                  </button>
                )}

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}