"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  Kanban,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Usuario = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
  email: string | null;
};

type Columna = {
  id: string;
  nombre: string;
  orden: number | null;
};

type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  columna_id: string | null;
  asignado_id: string | null;
  creador_id: string | null;
  prioridad: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
  asignado?: Usuario | null;
  creador?: Usuario | null;
  columna?: Columna | null;
};

type FormTarea = {
  titulo: string;
  descripcion: string;
  columna_id: string;
  asignado_id: string;
  prioridad: string;
  fecha_vencimiento: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function nombreUsuario(usuario?: Usuario | null) {
  if (!usuario) return "Sin asignar";

  if (usuario.razon_social?.trim()) {
    return usuario.razon_social.trim();
  }

  return (
    `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim() ||
    "Usuario"
  );
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fecha(valor?: string | null) {
  if (!valor) return "Sin fecha";

  const d = new Date(`${valor}T00:00:00`);

  if (Number.isNaN(d.getTime())) return valor;

  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function prioridadClass(prioridad?: string | null) {
  switch (normalizar(prioridad)) {
    case "alta":
      return "bg-red-50 text-red-700 border-red-100";

    case "baja":
      return "bg-sky-50 text-sky-700 border-sky-100";

    default:
      return "bg-amber-50 text-amber-700 border-amber-100";
  }
}

function columnaClass(index: number) {
  const estilos = [
    "border-indigo-200 bg-indigo-50/50",
    "border-cyan-200 bg-cyan-50/50",
    "border-emerald-200 bg-emerald-50/50",
    "border-orange-200 bg-orange-50/50",
    "border-violet-200 bg-violet-50/50",
  ];

  return estilos[index % estilos.length];
}

function columnaDotClass(index: number) {
  const colores = [
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-violet-500",
  ];

  return colores[index % colores.length];
}

function esVencida(tarea: Tarea) {
  if (!tarea.fecha_vencimiento) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(
    `${tarea.fecha_vencimiento}T00:00:00`
  );

  vencimiento.setHours(0, 0, 0, 0);

  return vencimiento < hoy;
}

function esHoy(tarea: Tarea) {
  if (!tarea.fecha_vencimiento) return false;

  const hoy = new Date();

  const fechaTarea = new Date(
    `${tarea.fecha_vencimiento}T00:00:00`
  );

  return (
    hoy.getFullYear() === fechaTarea.getFullYear() &&
    hoy.getMonth() === fechaTarea.getMonth() &&
    hoy.getDate() === fechaTarea.getDate()
  );
}

export default function KanbanPage() {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] =
    useState("todas");

  const [soloMias, setSoloMias] = useState(false);

  const [modalNueva, setModalNueva] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);

  const [tareaSeleccionada, setTareaSeleccionada] =
    useState<Tarea | null>(null);

  const [tareaEditando, setTareaEditando] =
    useState<Tarea | null>(null);

  /*
   * Actualmente kanban_tareas no posee una columna activo.
   *
   * Por eso mantenemos las tareas desactivadas en localStorage.
   * Esto permite ocultarlas del tablero sin eliminarlas de Supabase
   * y permite que el creador las vuelva a activar.
   */
  const [tareasDesactivadas, setTareasDesactivadas] =
    useState<Set<string>>(() => new Set());

  const [mostrarDesactivadas, setMostrarDesactivadas] =
    useState(false);

  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState<FormTarea>({
    titulo: "",
    descripcion: "",
    columna_id: "",
    asignado_id: "",
    prioridad: "Media",
    fecha_vencimiento: "",
  });

  const [formEditar, setFormEditar] =
    useState<FormTarea>({
      titulo: "",
      descripcion: "",
      columna_id: "",
      asignado_id: "",
      prioridad: "Media",
      fecha_vencimiento: "",
    });

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const headers = await authHeaders();

      const response = await fetch("/api/kanban", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible cargar Kanban."
        );
      }

      const nuevoPerfilId =
        data.perfil?.id || null;

      setPerfilId(nuevoPerfilId);

      /*
       * Recuperamos las tareas desactivadas del usuario.
       */
      if (
        nuevoPerfilId &&
        typeof window !== "undefined"
      ) {
        try {
          const clave =
            `kanban_tareas_desactivadas_v1_${nuevoPerfilId}`;

          const guardadas = JSON.parse(
            localStorage.getItem(clave) || "[]"
          );

          setTareasDesactivadas(
            new Set<string>(
              Array.isArray(guardadas)
                ? guardadas.filter(
                    (id): id is string =>
                      typeof id === "string"
                  )
                : []
            )
          );
        } catch (error) {
          console.warn(
            "No fue posible recuperar las tareas desactivadas:",
            error
          );

          setTareasDesactivadas(
            new Set<string>()
          );
        }
      }

      setColumnas(
        Array.isArray(data.columnas)
          ? data.columnas
          : []
      );

      setTareas(
        Array.isArray(data.tareas)
          ? data.tareas
          : []
      );

      setUsuarios(
        Array.isArray(data.usuarios)
          ? data.usuarios
          : []
      );

      if (
        Array.isArray(data.columnas) &&
        data.columnas.length > 0 &&
        !form.columna_id
      ) {
        setForm((prev) => ({
          ...prev,
          columna_id:
            data.columnas[0].id,
        }));
      }
    } catch (e: any) {
      console.error(
        "Error cargando Kanban:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cargar Kanban."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tareasFiltradas = useMemo(() => {
    const q = normalizar(busqueda);

    return tareas.filter((tarea) => {
      /*
       * Las tareas desactivadas no aparecen
       * en las columnas normales.
       */
      if (
        tareasDesactivadas.has(tarea.id)
      ) {
        return false;
      }

      const texto = normalizar(
        [
          tarea.titulo,
          tarea.descripcion,
          tarea.prioridad,
          nombreUsuario(tarea.asignado),
          nombreUsuario(tarea.creador),
          tarea.columna?.nombre,
          tarea.fecha_vencimiento,
        ].join(" ")
      );

      const coincideBusqueda =
        !q || texto.includes(q);

      const coincidePrioridad =
        filtroPrioridad === "todas" ||
        normalizar(tarea.prioridad) ===
          normalizar(filtroPrioridad);

      const coincideMias =
        !soloMias ||
        tarea.creador_id === perfilId ||
        tarea.asignado_id === perfilId;

      return (
        coincideBusqueda &&
        coincidePrioridad &&
        coincideMias
      );
    });
  }, [
    tareas,
    busqueda,
    filtroPrioridad,
    soloMias,
    perfilId,
    tareasDesactivadas,
  ]);

  async function crearTarea(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.titulo.trim()) {
      alert(
        "Debes ingresar el título de la tarea."
      );
      return;
    }

    if (!form.columna_id) {
      alert(
        "Debes seleccionar la columna inicial."
      );
      return;
    }

    setCreando(true);

    try {
      const headers = {
        ...(await authHeaders()),
        "Content-Type": "application/json",
      };

      const response = await fetch(
        "/api/kanban",
        {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible crear la tarea."
        );
      }

      setModalNueva(false);

      setForm({
        titulo: "",
        descripcion: "",
        columna_id:
          columnas[0]?.id || "",
        asignado_id: "",
        prioridad: "Media",
        fecha_vencimiento: "",
      });

      await cargarDatos();
    } catch (e: any) {
      alert(
        e?.message ||
          "No fue posible crear la tarea."
      );
    } finally {
      setCreando(false);
    }
  }

  async function actualizarTarea(
    tareaId: string,
    cambios: Partial<FormTarea>
  ) {
    setGuardando(true);

    try {
      const headers = {
        ...(await authHeaders()),
        "Content-Type": "application/json",
      };

      const response = await fetch(
        "/api/kanban",
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            tarea_id: tareaId,
            ...cambios,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible actualizar la tarea."
        );
      }

      setTareas((actuales) =>
        actuales.map((tarea) =>
          tarea.id === tareaId
            ? data.tarea
            : tarea
        )
      );

      if (
        tareaSeleccionada?.id ===
        tareaId
      ) {
        setTareaSeleccionada(
          data.tarea
        );
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "No fue posible actualizar la tarea."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function moverTarea(
    tarea: Tarea,
    columnaId: string
  ) {
    if (
      tarea.columna_id ===
      columnaId
    ) {
      return;
    }

    await actualizarTarea(
      tarea.id,
      {
        columna_id: columnaId,
      }
    );
  }

  async function eliminarTarea(
    tarea: Tarea
  ) {
    if (
      !confirm(
        `¿Deseas eliminar definitivamente la tarea "${tarea.titulo}"?`
      )
    ) {
      return;
    }

    try {
      const headers =
        await authHeaders();

      const response = await fetch(
        `/api/kanban?tarea_id=${encodeURIComponent(
          tarea.id
        )}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "No fue posible eliminar la tarea."
        );
      }

      setTareas((actuales) =>
        actuales.filter(
          (item) =>
            item.id !== tarea.id
        )
      );

      /*
       * Si estaba desactivada, también
       * eliminamos su referencia local.
       */
      setTareasDesactivadas(
        (actuales) => {
          const siguiente =
            new Set<string>(actuales);

          siguiente.delete(
            tarea.id
          );

          guardarTareasDesactivadas(
            siguiente
          );

          return siguiente;
        }
      );

      if (
        tareaSeleccionada?.id ===
        tarea.id
      ) {
        setTareaSeleccionada(null);
        setModalDetalle(false);
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "No fue posible eliminar la tarea."
      );
    }
  }

  function abrirDetalle(
    tarea: Tarea
  ) {
    setTareaSeleccionada(tarea);
    setModalDetalle(true);
  }

  function abrirEditar(
    tarea: Tarea
  ) {
    setTareaEditando(tarea);

    setFormEditar({
      titulo:
        tarea.titulo || "",
      descripcion:
        tarea.descripcion || "",
      columna_id:
        tarea.columna_id ||
        columnas[0]?.id ||
        "",
      asignado_id:
        tarea.asignado_id ||
        "",
      prioridad:
        tarea.prioridad ||
        "Media",
      fecha_vencimiento:
        tarea.fecha_vencimiento ||
        "",
    });

    setModalDetalle(false);
    setModalEditar(true);
  }

  async function guardarEdicion(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!tareaEditando) {
      return;
    }

    if (
      !formEditar.titulo.trim()
    ) {
      alert(
        "Debes ingresar el título de la tarea."
      );
      return;
    }

    if (
      !formEditar.columna_id
    ) {
      alert(
        "Debes seleccionar la columna de la tarea."
      );
      return;
    }

    await actualizarTarea(
      tareaEditando.id,
      formEditar
    );

    setModalEditar(false);
    setTareaEditando(null);
  }

  /*
   * Guarda la lista de tareas desactivadas
   * para el usuario actual.
   */
  function guardarTareasDesactivadas(
    siguiente: Set<string>
  ) {
    if (
      !perfilId ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      const clave =
        `kanban_tareas_desactivadas_v1_${perfilId}`;

      localStorage.setItem(
        clave,
        JSON.stringify(
          Array.from(siguiente)
        )
      );
    } catch (error) {
      console.warn(
        "No fue posible guardar las tareas desactivadas:",
        error
      );
    }
  }

  /*
   * DESACTIVAR
   *
   * No elimina la tarea.
   * Solamente la oculta del tablero activo.
   */
  function desactivarTarea(
    tarea: Tarea
  ) {
    if (
      tarea.creador_id !== perfilId
    ) {
      alert(
        "Solo el creador de la tarea puede desactivarla o volver a activarla."
      );
      return;
    }

    if (
      !confirm(
        `¿Deseas desactivar temporalmente la tarea "${tarea.titulo}"?

La tarea no será eliminada. Quedará disponible en "Tareas desactivadas" para que puedas volver a activarla.`
      )
    ) {
      return;
    }

    setTareasDesactivadas(
      (actuales) => {
        const siguiente =
          new Set<string>(actuales);

        siguiente.add(
          tarea.id
        );

        guardarTareasDesactivadas(
          siguiente
        );

        return siguiente;
      }
    );

    if (
      tareaSeleccionada?.id ===
      tarea.id
    ) {
      setTareaSeleccionada(null);
      setModalDetalle(false);
    }
  }

  /*
   * ACTIVAR
   *
   * Quita el ID de la lista local de
   * desactivadas. Como la tarea nunca fue
   * eliminada ni movida de columna, vuelve
   * automáticamente a su posición original.
   */
  function activarTarea(
    tarea: Tarea
  ) {
    if (
      tarea.creador_id !== perfilId
    ) {
      alert(
        "Solo el creador de la tarea puede volver a activarla."
      );
      return;
    }

    if (
      !confirm(
        `¿Deseas volver a activar la tarea "${tarea.titulo}"?`
      )
    ) {
      return;
    }

    setTareasDesactivadas(
      (actuales) => {
        const siguiente =
          new Set<string>(actuales);

        siguiente.delete(
          tarea.id
        );

        guardarTareasDesactivadas(
          siguiente
        );

        return siguiente;
      }
    );
  }

  /*
   * Solo mostramos al creador sus
   * propias tareas desactivadas.
   */
  const tareasDesactivadasVisibles =
    useMemo(
      () =>
        tareas.filter(
          (tarea) =>
            tareasDesactivadas.has(
              tarea.id
            ) &&
            tarea.creador_id ===
              perfilId
        ),
      [
        tareas,
        tareasDesactivadas,
        perfilId,
      ]
    );

  const totalVencidas =
    tareasFiltradas.filter(
      esVencida
    ).length;

  const totalHoy =
    tareasFiltradas.filter(
      esHoy
    ).length;

  return (
    <main className="min-h-[85vh] bg-slate-50 p-4 sm:p-5">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* =====================================================
            ENCABEZADO
        ===================================================== */}

        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-3">

                <div className="rounded-2xl bg-indigo-50 p-3">
                  <Kanban className="h-6 w-6 text-indigo-600" />
                </div>

                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Tablero Kanban
                  </h1>

                  <p className="text-xs text-slate-500">
                    Organiza, asigna y da seguimiento a las tareas del equipo.
                  </p>
                </div>

              </div>
            </div>

            <button
              onClick={() =>
                setModalNueva(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nueva tarea
            </button>

          </div>

          {/* =====================================================
              CONTROLES
          ===================================================== */}

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">

            <div className="relative">
              <input
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="Buscar por tarea, descripción, usuario, columna o prioridad..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            <select
              value={filtroPrioridad}
              onChange={(e) =>
                setFiltroPrioridad(
                  e.target.value
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="todas">
                Todas las prioridades
              </option>

              <option value="Alta">
                Alta
              </option>

              <option value="Media">
                Media
              </option>

              <option value="Baja">
                Baja
              </option>
            </select>

            <button
              onClick={() =>
                setSoloMias(
                  (v) => !v
                )
              }
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                soloMias
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {soloMias
                ? "Mis tareas"
                : "Todas"}
            </button>

            <button
              onClick={() =>
                void cargarDatos()
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="Actualizar tablero"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>

            <button
              onClick={() =>
                setMostrarDesactivadas(
                  (v) => !v
                )
              }
              disabled={
                tareasDesactivadasVisibles.length ===
                0
              }
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                mostrarDesactivadas
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title="Mostrar u ocultar las tareas desactivadas que creaste"
            >
              <Power className="h-3.5 w-3.5" />
              Desactivadas (
              {
                tareasDesactivadasVisibles.length
              }
              )
            </button>

          </div>

          {/* =====================================================
              INDICADORES
          ===================================================== */}

          <div className="mt-4 flex flex-wrap gap-2 text-[10px]">

            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
              {tareasFiltradas.length} tareas
            </span>

            {totalHoy > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                {totalHoy} para hoy
              </span>
            )}

            {totalVencidas > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-700">
                {totalVencidas} vencidas
              </span>
            )}

          </div>
        </header>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">

            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">
                No fue posible cargar Kanban.
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            TABLERO
        ===================================================== */}

        {cargando ? (

          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>

        ) : (

          <section className="grid min-w-0 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">

            {columnas.map(
              (columna, index) => {

                const tareasColumna =
                  tareasFiltradas.filter(
                    (tarea) =>
                      tarea.columna_id ===
                      columna.id
                  );

                return (

                  <div
                    key={columna.id}
                    className={`min-w-0 rounded-2xl border p-4 ${columnaClass(
                      index
                    )}`}
                  >

                    {/* CABECERA COLUMNA */}

                    <div className="mb-4 flex items-center justify-between">

                      <div className="flex items-center gap-2">

                        <span
                          className={`h-2.5 w-2.5 rounded-full ${columnaDotClass(
                            index
                          )}`}
                        />

                        <h2 className="text-sm font-bold text-slate-800">
                          {columna.nombre}
                        </h2>

                      </div>

                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
                        {tareasColumna.length}
                      </span>

                    </div>

                    {/* TAREAS */}

                    <div className="min-h-[360px] space-y-3">

                      {tareasColumna.length ===
                      0 ? (

                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-xs text-slate-400">
                          No hay tareas en esta columna.
                        </div>

                      ) : (

                        tareasColumna.map(
                          (tarea) => {

                            const vencida =
                              esVencida(
                                tarea
                              );

                            const hoy =
                              esHoy(
                                tarea
                              );

                            const colIndex =
                              columnas.findIndex(
                                (c) =>
                                  c.id ===
                                  tarea.columna_id
                              );

                            return (

                              <article
                                key={tarea.id}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                              >

                                {/* PRIORIDAD */}

                                <div className="flex items-start justify-between gap-3">

                                  <span
                                    className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${prioridadClass(
                                      tarea.prioridad
                                    )}`}
                                  >
                                    {tarea.prioridad ||
                                      "Media"}
                                  </span>

                                </div>

                                {/* INFORMACIÓN PRINCIPAL */}

                                <button
                                  onClick={() =>
                                    abrirDetalle(
                                      tarea
                                    )
                                  }
                                  className="mt-3 block w-full text-left"
                                >

                                  <h3 className="break-words text-sm font-bold text-slate-900">
                                    {tarea.titulo}
                                  </h3>

                                  <p className="mt-1 line-clamp-3 break-words text-[11px] leading-5 text-slate-500">
                                    {tarea.descripcion ||
                                      "Sin descripción."}
                                  </p>

                                </button>

                                {/* RESPONSABLE Y FECHA */}

                                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">

                                  <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500">

                                    <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                    <span className="truncate">
                                      {nombreUsuario(
                                        tarea.asignado
                                      )}
                                    </span>

                                  </div>

                                  {tarea.fecha_vencimiento && (

                                    <div
                                      className={`flex items-center gap-2 text-[10px] font-semibold ${
                                        vencida
                                          ? "text-red-600"
                                          : hoy
                                            ? "text-amber-600"
                                            : "text-slate-500"
                                      }`}
                                    >

                                      <Calendar className="h-3.5 w-3.5" />

                                      {vencida
                                        ? `Vencida · ${fecha(
                                            tarea.fecha_vencimiento
                                          )}`
                                        : hoy
                                          ? "Vence hoy"
                                          : fecha(
                                              tarea.fecha_vencimiento
                                            )}

                                    </div>

                                  )}

                                </div>

                                {/* BOTONES */}

                                <div className="mt-4 space-y-2 border-t border-dashed border-slate-100 pt-3">

                                  <div className="flex flex-wrap items-center gap-1.5">

                                    <button
                                      onClick={() =>
                                        abrirDetalle(
                                          tarea
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                                      title="Ver información completa de la tarea"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Ver detalle
                                    </button>

                                    <button
                                      onClick={() =>
                                        abrirEditar(
                                          tarea
                                        )
                                      }
                                      disabled={
                                        guardando
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                                      title="Editar tarea"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Editar
                                    </button>

                                    {tarea.creador_id ===
                                      perfilId && (

                                      <button
                                        onClick={() =>
                                          desactivarTarea(
                                            tarea
                                          )
                                        }
                                        disabled={
                                          guardando
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                                        title="Desactivar temporalmente esta tarea"
                                      >
                                        <Power className="h-3.5 w-3.5" />
                                        Desactivar
                                      </button>

                                    )}

                                    <button
                                      onClick={() =>
                                        void eliminarTarea(
                                          tarea
                                        )
                                      }
                                      disabled={
                                        guardando
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                                      title="Eliminar definitivamente la tarea"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Eliminar
                                    </button>

                                  </div>

                                  {/* MOVIMIENTO */}

                                  <div className="flex items-center justify-end gap-1">

                                    {colIndex >
                                      0 && (

                                      <button
                                        disabled={
                                          guardando
                                        }
                                        onClick={() =>
                                          void moverTarea(
                                            tarea,
                                            columnas[
                                              colIndex -
                                                1
                                            ].id
                                          )
                                        }
                                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                                        title={`Mover a ${columnas[
                                          colIndex -
                                            1
                                        ].nombre}`}
                                      >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                      </button>

                                    )}

                                    {colIndex <
                                      columnas.length -
                                        1 && (

                                      <button
                                        disabled={
                                          guardando
                                        }
                                        onClick={() =>
                                          void moverTarea(
                                            tarea,
                                            columnas[
                                              colIndex +
                                                1
                                            ].id
                                          )
                                        }
                                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                                        title={`Mover a ${columnas[
                                          colIndex +
                                            1
                                        ].nombre}`}
                                      >
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </button>

                                    )}

                                  </div>

                                </div>

                              </article>

                            );
                          }
                        )

                      )}

                    </div>

                  </div>

                );
              }
            )}

          </section>

        )}

        {/* =====================================================
            TAREAS DESACTIVADAS
        ===================================================== */}

        {mostrarDesactivadas &&
          tareasDesactivadasVisibles.length >
            0 && (

          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>

                <div className="flex items-center gap-2">

                  <Power className="h-4 w-4 text-amber-600" />

                  <h2 className="text-sm font-bold text-slate-800">
                    Tareas desactivadas
                  </h2>

                </div>

                <p className="mt-1 text-[10px] text-slate-500">
                  Estas tareas no aparecen en las columnas activas. Como creador, puedes volver a activarlas cuando lo necesites.
                </p>

              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-amber-700 shadow-sm">
                {
                  tareasDesactivadasVisibles.length
                }
              </span>

            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">

              {tareasDesactivadasVisibles.map(
                (tarea) => (

                  <article
                    key={tarea.id}
                    className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h3 className="break-words text-sm font-bold text-slate-900">
                          {tarea.titulo}
                        </h3>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {tarea.columna?.nombre ||
                            "Sin columna"}{" "}
                          · Desactivada
                        </p>

                      </div>

                      <span
                        className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-bold ${prioridadClass(
                          tarea.prioridad
                        )}`}
                      >
                        {tarea.prioridad ||
                          "Media"}
                      </span>

                    </div>

                    <p className="mt-3 line-clamp-3 break-words text-[11px] leading-5 text-slate-500">
                      {tarea.descripcion ||
                        "Sin descripción."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">

                      <button
                        onClick={() =>
                          abrirDetalle(
                            tarea
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver detalle
                      </button>

                      <button
                        onClick={() =>
                          abrirEditar(
                            tarea
                          )
                        }
                        disabled={
                          guardando
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          activarTarea(
                            tarea
                          )
                        }
                        disabled={
                          guardando
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        title="Volver a mostrar la tarea en su columna"
                      >
                        <Power className="h-3.5 w-3.5" />
                        Activar
                      </button>

                      <button
                        onClick={() =>
                          void eliminarTarea(
                            tarea
                          )
                        }
                        disabled={
                          guardando
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          </section>

        )}

        {/* =====================================================
            MODAL NUEVA TAREA
        ===================================================== */}

        {modalNueva && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

              <div className="mb-5 flex items-start justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Nueva tarea
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Define qué debe hacerse, quién la ejecutará y cuándo debe estar terminada.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setModalNueva(false)
                  }
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <form
                onSubmit={crearTarea}
                className="space-y-4"
              >

                <div>

                  <label className="text-xs font-bold text-slate-700">
                    Título *
                  </label>

                  <p className="mb-1 text-[10px] text-slate-400">
                    Nombre breve que identifique claramente la tarea.
                  </p>

                  <input
                    required
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        titulo:
                          e.target.value,
                      })
                    }
                    placeholder="Ej. Revisar contrato del proveedor"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                  />

                </div>

                <div>

                  <label className="text-xs font-bold text-slate-700">
                    Descripción
                  </label>

                  <p className="mb-1 text-[10px] text-slate-400">
                    Explica el trabajo, antecedentes, entregables o instrucciones que necesita conocer el responsable.
                  </p>

                  <textarea
                    rows={5}
                    value={
                      form.descripcion
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descripcion:
                          e.target.value,
                      })
                    }
                    placeholder="Describe lo que debe realizarse..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                  />

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Columna inicial *
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Estado desde el cual comenzará a fluir la tarea.
                    </p>

                    <select
                      required
                      value={
                        form.columna_id
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          columna_id:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      {columnas.map(
                        (columna) => (
                          <option
                            key={
                              columna.id
                            }
                            value={
                              columna.id
                            }
                          >
                            {
                              columna.nombre
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Prioridad
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Indica la urgencia relativa de la tarea.
                    </p>

                    <select
                      value={
                        form.prioridad
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          prioridad:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      <option value="Baja">
                        Baja
                      </option>

                      <option value="Media">
                        Media
                      </option>

                      <option value="Alta">
                        Alta
                      </option>

                    </select>

                  </div>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Responsable
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Usuario que debe ejecutar la tarea. Recibirá una notificación si tiene activadas las notificaciones de tareas.
                    </p>

                    <select
                      value={
                        form.asignado_id
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          asignado_id:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      <option value="">
                        Sin asignar
                      </option>

                      {usuarios.map(
                        (usuario) => (
                          <option
                            key={
                              usuario.id
                            }
                            value={
                              usuario.id
                            }
                          >
                            {nombreUsuario(
                              usuario
                            )}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Fecha de vencimiento
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Fecha límite en la que la tarea debería estar terminada.
                    </p>

                    <input
                      type="date"
                      value={
                        form.fecha_vencimiento
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fecha_vencimiento:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    />

                  </div>

                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                  <button
                    type="button"
                    onClick={() =>
                      setModalNueva(false)
                    }
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={creando}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >

                    {creando && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    Crear tarea

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

        {/* =====================================================
            MODAL EDITAR
        ===================================================== */}

        {modalEditar &&
          tareaEditando && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

              <div className="mb-5 flex items-start justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Editar tarea
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Modifica la información de la tarea. Los cambios se guardarán en el tablero.
                  </p>

                </div>

                <button
                  onClick={() => {
                    setModalEditar(
                      false
                    );

                    setTareaEditando(
                      null
                    );
                  }}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <form
                onSubmit={
                  guardarEdicion
                }
                className="space-y-4"
              >

                <div>

                  <label className="text-xs font-bold text-slate-700">
                    Título *
                  </label>

                  <p className="mb-1 text-[10px] text-slate-400">
                    Nombre breve que identifica la tarea.
                  </p>

                  <input
                    required
                    value={
                      formEditar.titulo
                    }
                    onChange={(e) =>
                      setFormEditar({
                        ...formEditar,
                        titulo:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                  />

                </div>

                <div>

                  <label className="text-xs font-bold text-slate-700">
                    Descripción
                  </label>

                  <p className="mb-1 text-[10px] text-slate-400">
                    Instrucciones, antecedentes o entregables que debe conocer el responsable.
                  </p>

                  <textarea
                    rows={5}
                    value={
                      formEditar.descripcion
                    }
                    onChange={(e) =>
                      setFormEditar({
                        ...formEditar,
                        descripcion:
                          e.target.value,
                      })
                    }
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                  />

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Columna *
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Estado actual de la tarea.
                    </p>

                    <select
                      required
                      value={
                        formEditar.columna_id
                      }
                      onChange={(e) =>
                        setFormEditar({
                          ...formEditar,
                          columna_id:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      {columnas.map(
                        (columna) => (
                          <option
                            key={
                              columna.id
                            }
                            value={
                              columna.id
                            }
                          >
                            {
                              columna.nombre
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Prioridad
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Nivel de urgencia relativa.
                    </p>

                    <select
                      value={
                        formEditar.prioridad
                      }
                      onChange={(e) =>
                        setFormEditar({
                          ...formEditar,
                          prioridad:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      <option value="Baja">
                        Baja
                      </option>

                      <option value="Media">
                        Media
                      </option>

                      <option value="Alta">
                        Alta
                      </option>

                    </select>

                  </div>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Responsable
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Usuario que debe ejecutar la tarea.
                    </p>

                    <select
                      value={
                        formEditar.asignado_id
                      }
                      onChange={(e) =>
                        setFormEditar({
                          ...formEditar,
                          asignado_id:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    >

                      <option value="">
                        Sin asignar
                      </option>

                      {usuarios.map(
                        (usuario) => (
                          <option
                            key={
                              usuario.id
                            }
                            value={
                              usuario.id
                            }
                          >
                            {nombreUsuario(
                              usuario
                            )}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label className="text-xs font-bold text-slate-700">
                      Fecha de vencimiento
                    </label>

                    <p className="mb-1 text-[10px] text-slate-400">
                      Fecha límite para completar la tarea.
                    </p>

                    <input
                      type="date"
                      value={
                        formEditar.fecha_vencimiento
                      }
                      onChange={(e) =>
                        setFormEditar({
                          ...formEditar,
                          fecha_vencimiento:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
                    />

                  </div>

                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                  <button
                    type="button"
                    onClick={() => {
                      setModalEditar(
                        false
                      );

                      setTareaEditando(
                        null
                      );
                    }}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      guardando
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >

                    {guardando && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    Guardar cambios

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

        {/* =====================================================
            MODAL DETALLE
        ===================================================== */}

        {modalDetalle &&
          tareaSeleccionada && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

              {/* ENCABEZADO */}

              <div className="shrink-0 p-6">

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <span
                      className={`inline-flex rounded-lg border px-2 py-1 text-[9px] font-bold ${prioridadClass(
                        tareaSeleccionada.prioridad
                      )}`}
                    >
                      Prioridad{" "}
                      {tareaSeleccionada.prioridad ||
                        "Media"}
                    </span>

                    <h2 className="mt-3 break-words text-xl font-bold text-slate-900">
                      {
                        tareaSeleccionada.titulo
                      }
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Creada el{" "}
                      {new Date(
                        tareaSeleccionada.created_at
                      ).toLocaleDateString(
                        "es-CO"
                      )}
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setModalDetalle(
                        false
                      )
                    }
                    className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                    title="Cerrar visualizador"
                  >
                    <X className="h-5 w-5" />
                  </button>

                </div>

              </div>

              {/* CONTENIDO */}

              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Responsable
                    </p>

                    <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">

                      <User className="h-4 w-4 shrink-0 text-indigo-500" />

                      <span className="break-words">
                        {nombreUsuario(
                          tareaSeleccionada.asignado
                        )}
                      </span>

                    </div>

                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Creador
                    </p>

                    <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">

                      <User className="h-4 w-4 shrink-0 text-cyan-500" />

                      <span className="break-words">
                        {nombreUsuario(
                          tareaSeleccionada.creador
                        )}
                      </span>

                    </div>

                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Estado actual
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                      {
                        tareaSeleccionada.columna
                          ?.nombre ||
                        "Sin columna"
                      }
                    </p>

                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Vencimiento
                    </p>

                    <p
                      className={`mt-2 text-sm font-semibold ${
                        esVencida(
                          tareaSeleccionada
                        )
                          ? "text-red-600"
                          : esHoy(
                                tareaSeleccionada
                              )
                            ? "text-amber-600"
                            : "text-slate-800"
                      }`}
                    >
                      {
                        tareaSeleccionada.fecha_vencimiento
                          ? fecha(
                              tareaSeleccionada.fecha_vencimiento
                            )
                          : "Sin fecha"
                      }
                    </p>

                  </div>

                </div>

                {/* DESCRIPCIÓN */}

                <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">

                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Descripción
                  </p>

                  <div className="mt-2 max-h-[320px] overflow-y-auto rounded-xl bg-slate-50 p-4">

                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-slate-600">
                      {
                        tareaSeleccionada.descripcion ||
                        "Esta tarea no tiene una descripción registrada."
                      }
                    </p>

                  </div>

                </div>

              </div>

              {/* PIE */}

              <div className="shrink-0 border-t border-slate-100 bg-white p-4">

                <div className="flex flex-wrap justify-between gap-3">

                  <div className="flex flex-wrap gap-2">

                    {tareasDesactivadas.has(
                      tareaSeleccionada.id
                    ) &&
                      tareaSeleccionada.creador_id ===
                        perfilId && (

                        <button
                          onClick={() => {
                            activarTarea(
                              tareaSeleccionada
                            );

                            setModalDetalle(
                              false
                            );
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Power className="h-4 w-4" />
                          Activar tarea
                        </button>

                      )}

                    {tareaSeleccionada.creador_id ===
                      perfilId &&
                      !tareasDesactivadas.has(
                        tareaSeleccionada.id
                      ) && (

                        <button
                          onClick={() =>
                            desactivarTarea(
                              tareaSeleccionada
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          <Power className="h-4 w-4" />
                          Desactivar
                        </button>

                      )}

                    <button
                      onClick={() =>
                        void eliminarTarea(
                          tareaSeleccionada
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      onClick={() =>
                        setModalDetalle(
                          false
                        )
                      }
                      className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cerrar
                    </button>

                    {tareaSeleccionada.columna
                      ?.nombre &&
                      /finalizado|completado|terminado|cerrado|hecho/i.test(
                        tareaSeleccionada.columna
                          .nombre
                      ) && (

                        <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Tarea completada
                        </span>

                      )}

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>
    </main>
  );
}