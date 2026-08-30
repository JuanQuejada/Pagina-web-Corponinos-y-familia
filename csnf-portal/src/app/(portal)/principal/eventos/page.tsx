"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Video,
  User,
  Trash2,
  Loader2,
  Search,
  X,
  Users,
  Bell,
  CheckCircle2,
  Pencil,
  CircleDot,
  Ban,
  ListFilter,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Usuario = {
  id: string;
  nombres?: string | null;
  apellidos?: string | null;
  razon_social?: string | null;
  email?: string | null;
};

type Participante = {
  id: string;
  nombre: string;
  email?: string | null;
};

type Evento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  todo_el_dia: boolean | null;
  ubicacion: string | null;
  enlace_virtual: string | null;
  estado: string | null;
  prioridad: string | null;
  creador_id: string;
  asignado_a: string | null;
  participantes: string[];
  recordatorio_minutos: number | null;
  recordatorio_enviado: boolean | null;
  creador: {
    id: string;
    nombre: string;
    email?: string | null;
  } | null;
  asignado: {
    id: string;
    nombre: string;
    email?: string | null;
  } | null;
  participantes_detalle: Participante[];
};

type Formulario = {
  titulo: string;
  descripcion: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  ubicacion: string;
  enlace_virtual: string;
  prioridad: string;
  estado: string;
  asignado_a: string;
  participantes: string[];
  recordatorio_minutos: number;
};

const FORM_INICIAL: Formulario = {
  titulo: "",
  descripcion: "",
  tipo: "Reunión",
  fecha_inicio: "",
  fecha_fin: "",
  todo_el_dia: false,
  ubicacion: "",
  enlace_virtual: "",
  prioridad: "media",
  estado: "pendiente",
  asignado_a: "",
  participantes: [],
  recordatorio_minutos: 15,
};

function nombreUsuario(u?: Usuario | null) {
  if (!u) return "Usuario";

  if (u.razon_social?.trim()) {
    return u.razon_social.trim();
  }

  return (
    `${u.nombres || ""} ${u.apellidos || ""}`.trim() ||
    u.email ||
    "Usuario"
  );
}

function fechaLocal(value: string, todoElDia = false) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  if (todoElDia) {
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Estilo de la etiqueta de prioridad.
 * Se conserva la lógica existente.
 */
function prioridadClass(priority: string | null) {
  switch (priority) {
    case "alta":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900";

    case "baja":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900";
  }
}

/**
 * NUEVO:
 * Estilo visual de toda la tarjeta según prioridad.
 *
 * Alta  -> rojo suave
 * Media -> amarillo suave
 * Baja  -> azul suave
 */
function prioridadCardClass(priority: string | null) {
  switch (priority) {
    case "alta":
      return {
        card:
          "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/70",
        strip:
          "bg-gradient-to-r from-rose-500 via-red-500 to-orange-400",
      };

    case "baja":
      return {
        card:
          "bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/70",
        strip:
          "bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-400",
      };

    default:
      return {
        card:
          "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/70",
        strip:
          "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400",
      };
  }
}

function estadoClass(estado: string | null) {
  switch (estado) {
    case "completado":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";

    case "en_curso":
      return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900";

    case "cancelado":
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900";
  }
}

export default function AgendaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalle, setDetalle] = useState<Evento | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [alcance, setAlcance] = useState("todos");

  const cargarDatos = async () => {
    setCargando(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      const token = authData.user
        ? (await supabase.auth.getSession()).data.session?.access_token
        : null;

      if (!token) return;

      const perfilRes = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authData.user!.id)
        .maybeSingle();

      if (perfilRes.data) {
        setCurrentPerfilId(perfilRes.data.id);
      }

      const params = new URLSearchParams();

      if (busqueda.trim()) {
        params.set("q", busqueda.trim());
      }

      if (estadoFiltro !== "todos") {
        params.set("estado", estadoFiltro);
      }

      if (prioridadFiltro !== "todos") {
        params.set("prioridad", prioridadFiltro);
      }

      if (tipoFiltro !== "todos") {
        params.set("tipo", tipoFiltro);
      }

      if (alcance !== "todos") {
        params.set("scope", alcance);
      }

      const [eventosRes, usuariosRes] = await Promise.all([
        fetch(`/api/agenda?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),

        supabase
          .from("usuarios")
          .select(
            "id,nombres,apellidos,razon_social,email"
          )
          .order("nombres", { ascending: true }),
      ]);

      const eventosJson = await eventosRes.json();

      if (!eventosRes.ok) {
        throw new Error(
          eventosJson.error ||
            "No fue posible cargar la agenda."
        );
      }

      setEventos(eventosJson.data || []);
      setUsuarios(usuariosRes.data || []);
    } catch (error: any) {
      console.error(error);

      alert(
        error.message ||
          "No fue posible cargar la agenda."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarDatos();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    busqueda,
    estadoFiltro,
    prioridadFiltro,
    tipoFiltro,
    alcance,
  ]);

  const tipos = useMemo(
    () => [
      "Reunión",
      "Hito",
      "Comité",
      "Recordatorio",
    ],
    []
  );

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setModalAbierto(true);
  };

  const abrirEditar = (evento: Evento) => {
    setEditandoId(evento.id);

    const toInput = (value: string | null) =>
      value
        ? new Date(value)
            .toISOString()
            .slice(0, 16)
        : "";

    setForm({
      titulo: evento.titulo || "",
      descripcion: evento.descripcion || "",
      tipo: evento.tipo || "Reunión",
      fecha_inicio: toInput(
        evento.fecha_inicio
      ),
      fecha_fin: toInput(evento.fecha_fin),
      todo_el_dia: Boolean(
        evento.todo_el_dia
      ),
      ubicacion: evento.ubicacion || "",
      enlace_virtual:
        evento.enlace_virtual || "",
      prioridad:
        evento.prioridad || "media",
      estado:
        evento.estado || "pendiente",
      asignado_a:
        evento.asignado_a || "",
      participantes:
        evento.participantes || [],
      recordatorio_minutos:
        evento.recordatorio_minutos ?? 15,
    });

    setDetalle(null);
    setModalAbierto(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !form.titulo.trim() ||
      !form.fecha_inicio
    ) {
      alert(
        "Debes ingresar el título y la fecha de inicio."
      );

      return;
    }

    if (
      !form.todo_el_dia &&
      form.fecha_fin &&
      new Date(form.fecha_fin) <
        new Date(form.fecha_inicio)
    ) {
      alert(
        "La fecha de finalización no puede ser anterior al inicio."
      );

      return;
    }

    setGuardando(true);

    try {
      const session =
        (await supabase.auth.getSession())
          .data.session;

      if (!session?.access_token) {
        throw new Error(
          "Sesión no válida."
        );
      }

      const payload = {
        ...form,
        titulo: form.titulo.trim(),
        descripcion:
          form.descripcion.trim() || null,
        fecha_fin:
          form.fecha_fin || null,
        ubicacion:
          form.ubicacion.trim() || null,
        enlace_virtual:
          form.enlace_virtual.trim() || null,
        asignado_a:
          form.asignado_a || null,
        participantes:
          form.participantes,
      };

      const response = await fetch(
        "/api/agenda",
        {
          method: editandoId
            ? "PATCH"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify(
            editandoId
              ? {
                  id: editandoId,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "No fue posible guardar el evento."
        );
      }

      setModalAbierto(false);
      setEditandoId(null);
      setForm(FORM_INICIAL);

      await cargarDatos();

      alert(
        editandoId
          ? "Evento actualizado correctamente."
          : "Evento creado correctamente."
      );
    } catch (error: any) {
      alert(
        error.message ||
          "No fue posible guardar el evento."
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (
    evento: Evento
  ) => {
    if (
      !confirm(
        `¿Deseas eliminar el evento "${evento.titulo}"?`
      )
    ) {
      return;
    }

    try {
      const session =
        (await supabase.auth.getSession())
          .data.session;

      if (!session?.access_token) {
        throw new Error(
          "Sesión no válida."
        );
      }

      const response = await fetch(
        `/api/agenda?id=${encodeURIComponent(
          evento.id
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "No fue posible eliminar el evento."
        );
      }

      setDetalle(null);

      setEventos((prev) =>
        prev.filter(
          (e) => e.id !== evento.id
        )
      );
    } catch (error: any) {
      alert(
        error.message ||
          "No fue posible eliminar el evento."
      );
    }
  };

  const cambiarEstado = async (
    evento: Evento,
    estado: string
  ) => {
    try {
      const session =
        (await supabase.auth.getSession())
          .data.session;

      if (!session?.access_token) {
        throw new Error(
          "Sesión no válida."
        );
      }

      const response = await fetch(
        "/api/agenda",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            id: evento.id,
            estado,
          }),
        }
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "No fue posible cambiar el estado."
        );
      }

      setDetalle(null);

      await cargarDatos();
    } catch (error: any) {
      alert(
        error.message ||
          "No fue posible cambiar el estado."
      );
    }
  };

  const toggleParticipante = (
    id: string
  ) => {
    setForm((prev) => ({
      ...prev,

      participantes:
        prev.participantes.includes(id)
          ? prev.participantes.filter(
              (x) => x !== id
            )
          : [
              ...prev.participantes,
              id,
            ],
    }));
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstadoFiltro("todos");
    setPrioridadFiltro("todos");
    setTipoFiltro("todos");
    setAlcance("todos");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-[85vh]">

      {/* =========================================================
          CABECERA / AGENDA INSTITUCIONAL
          ========================================================= */}

      <div
        className="
          rounded-3xl
          border
          border-slate-200
          dark:border-slate-800
          bg-white
          dark:bg-slate-900
          text-slate-900
          dark:text-white
          p-6
          shadow-lg
        "
      >
        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            justify-between
            gap-5
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
                mb-2
                text-indigo-600
                dark:text-indigo-300
                text-xs
                font-semibold
                uppercase
                tracking-wider
              "
            >
              <CalendarIcon className="h-4 w-4" />

              Agenda institucional
            </div>

            <h1
              className="
                text-2xl
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              Eventos, reuniones y compromisos
            </h1>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-1
                max-w-2xl
              "
            >
              Organiza actividades institucionales,
              asigna responsables, incluye participantes
              y prepara recordatorios para los
              involucrados.
            </p>
          </div>

          <button
            onClick={abrirCrear}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              hover:bg-indigo-700
              text-white
              px-4
              py-2.5
              text-sm
              font-bold
              shadow
              transition
              shrink-0
            "
          >
            <Plus className="h-4 w-4" />

            Nuevo evento
          </button>
        </div>
      </div>

      {/* =========================================================
          FILTROS
          ========================================================= */}

      <div
        className="
          bg-white
          dark:bg-slate-900
          border
          border-slate-200
          dark:border-slate-800
          rounded-2xl
          p-4
          shadow-sm
          space-y-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-bold
            text-slate-800
            dark:text-white
          "
        >
          <ListFilter className="h-4 w-4 text-indigo-600" />

          Buscar y filtrar agenda
        </div>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-5
            gap-3
          "
        >
          <div className="relative lg:col-span-2">
            <Search
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                h-4
                w-4
                text-slate-400
              "
            />

            <input
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              placeholder="Buscar título, descripción, ubicación..."
              className="
                w-full
                pl-9
                pr-3
                py-2.5
                text-sm
                rounded-xl
                bg-slate-50
                dark:bg-slate-800
                border
                border-slate-200
                dark:border-slate-700
                outline-none
                focus:ring-2
                focus:ring-indigo-500
                text-slate-900
                dark:text-white
              "
            />
          </div>

          <select
            value={alcance}
            onChange={(e) =>
              setAlcance(e.target.value)
            }
            className="
              px-3
              py-2.5
              text-sm
              rounded-xl
              bg-slate-50
              dark:bg-slate-800
              border
              border-slate-200
              dark:border-slate-700
              text-slate-900
              dark:text-white
            "
          >
            <option value="todos">
              Todos los eventos
            </option>

            <option value="mios">
              Creados por mí
            </option>

            <option value="asignados">
              Asignados a mí
            </option>

            <option value="involucrado">
              Donde participo
            </option>
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) =>
              setEstadoFiltro(e.target.value)
            }
            className="
              px-3
              py-2.5
              text-sm
              rounded-xl
              bg-slate-50
              dark:bg-slate-800
              border
              border-slate-200
              dark:border-slate-700
              text-slate-900
              dark:text-white
            "
          >
            <option value="todos">
              Todos los estados
            </option>

            <option value="pendiente">
              Pendiente
            </option>

            <option value="en_curso">
              En curso
            </option>

            <option value="completado">
              Completado
            </option>

            <option value="cancelado">
              Cancelado
            </option>
          </select>

          <select
            value={prioridadFiltro}
            onChange={(e) =>
              setPrioridadFiltro(
                e.target.value
              )
            }
            className="
              px-3
              py-2.5
              text-sm
              rounded-xl
              bg-slate-50
              dark:bg-slate-800
              border
              border-slate-200
              dark:border-slate-700
              text-slate-900
              dark:text-white
            "
          >
            <option value="todos">
              Todas las prioridades
            </option>

            <option value="alta">
              Alta
            </option>

            <option value="media">
              Media
            </option>

            <option value="baja">
              Baja
            </option>
          </select>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          <span className="text-xs text-slate-500">
            Tipo:
          </span>

          <button
            onClick={() =>
              setTipoFiltro("todos")
            }
            className={`
              px-3
              py-1.5
              rounded-full
              text-xs
              font-semibold
              ${
                tipoFiltro === "todos"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }
            `}
          >
            Todos
          </button>

          {tipos.map((tipo) => (
            <button
              key={tipo}
              onClick={() =>
                setTipoFiltro(tipo)
              }
              className={`
                px-3
                py-1.5
                rounded-full
                text-xs
                font-semibold
                ${
                  tipoFiltro === tipo
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }
              `}
            >
              {tipo}
            </button>
          ))}

          {(
            busqueda ||
            estadoFiltro !== "todos" ||
            prioridadFiltro !== "todos" ||
            tipoFiltro !== "todos" ||
            alcance !== "todos"
          ) && (
            <button
              onClick={limpiarFiltros}
              className="
                ml-auto
                inline-flex
                items-center
                gap-1
                text-xs
                text-slate-500
                hover:text-red-600
              "
            >
              <X className="h-3.5 w-3.5" />

              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          LISTADO
          ========================================================= */}

      {cargando ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : eventos.length === 0 ? (
        <div
          className="
            bg-white
            dark:bg-slate-900
            p-12
            rounded-2xl
            border
            border-slate-200
            dark:border-slate-800
            text-center
            space-y-3
          "
        >
          <CalendarIcon className="h-12 w-12 text-indigo-400 mx-auto" />

          <h2
            className="
              text-base
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            No hay eventos para mostrar
          </h2>

          <p className="text-sm text-slate-500">
            Prueba otros filtros o crea un nuevo
            evento institucional.
          </p>
        </div>
      ) : (
        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-4
            items-start
          "
        >
          {eventos.map((evento) => {
            const prioridadVisual =
              prioridadCardClass(
                evento.prioridad
              );

            return (
              <div
                key={evento.id}
                className={`
                  group
                  rounded-2xl
                  border
                  shadow-sm
                  hover:shadow-md
                  transition
                  overflow-hidden
                  self-start
                  ${prioridadVisual.card}
                `}
              >
                {/* Barra superior según prioridad */}
                <div
                  className={`
                    h-1.5
                    ${prioridadVisual.strip}
                  `}
                />

                <div className="p-5 space-y-4">

                  {/* -------------------------------------------------
                      ENCABEZADO DE TARJETA
                      ------------------------------------------------- */}

                  <div className="flex justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">

                      <span
                        className="
                          px-2
                          py-1
                          rounded-lg
                          text-[10px]
                          font-bold
                          bg-white/80
                          dark:bg-slate-900/70
                          text-slate-600
                          dark:text-slate-300
                          border
                          border-slate-200/70
                          dark:border-slate-700
                        "
                      >
                        {evento.tipo}
                      </span>

                      <span
                        className={`
                          px-2
                          py-1
                          rounded-lg
                          border
                          text-[10px]
                          font-bold
                          capitalize
                          ${prioridadClass(
                            evento.prioridad
                          )}
                        `}
                      >
                        {evento.prioridad ||
                          "media"}
                      </span>

                      <span
                        className={`
                          px-2
                          py-1
                          rounded-lg
                          border
                          text-[10px]
                          font-bold
                          capitalize
                          ${estadoClass(
                            evento.estado
                          )}
                        `}
                      >
                        {(
                          evento.estado ||
                          "pendiente"
                        ).replace(
                          "_",
                          " "
                        )}
                      </span>
                    </div>

                    {evento.creador_id ===
                      currentPerfilId && (
                      <button
                        onClick={() =>
                          eliminar(evento)
                        }
                        title="Eliminar evento"
                        className="
                          p-1.5
                          rounded-lg
                          text-slate-400
                          hover:text-rose-600
                          hover:bg-rose-50
                          dark:hover:bg-rose-950/30
                          shrink-0
                        "
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* -------------------------------------------------
                      INFORMACIÓN PRINCIPAL
                      ------------------------------------------------- */}

                  <div>
                    <h3
                      className="
                        text-base
                        font-bold
                        text-slate-900
                        dark:text-white
                        leading-snug
                        break-words
                      "
                    >
                      {evento.titulo}
                    </h3>

                    <p
                      className="
                        mt-2
                        text-sm
                        text-slate-600
                        dark:text-slate-400
                        whitespace-pre-wrap
                        break-words
                      "
                    >
                      {evento.descripcion ||
                        "Sin descripción detallada."}
                    </p>
                  </div>

                  {/* -------------------------------------------------
                      FECHAS / UBICACIÓN
                      ------------------------------------------------- */}

                  <div
                    className="
                      space-y-2
                      border-t
                      border-slate-200/70
                      dark:border-slate-700/70
                      pt-3
                      text-xs
                      text-slate-600
                      dark:text-slate-300
                    "
                  >
                    <div className="flex gap-2">
                      <Clock className="h-4 w-4 text-indigo-500 shrink-0" />

                      <span>
                        <b>Inicio:</b>{" "}
                        {fechaLocal(
                          evento.fecha_inicio,
                          Boolean(
                            evento.todo_el_dia
                          )
                        )}
                      </span>
                    </div>

                    {evento.fecha_fin && (
                      <div className="flex gap-2">
                        <Clock className="h-4 w-4 text-emerald-500 shrink-0" />

                        <span>
                          <b>Fin:</b>{" "}
                          {fechaLocal(
                            evento.fecha_fin
                          )}
                        </span>
                      </div>
                    )}

                    {evento.ubicacion && (
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-amber-500 shrink-0" />

                        <span className="break-words">
                          {evento.ubicacion}
                        </span>
                      </div>
                    )}

                    {evento.enlace_virtual && (
                      <div className="flex gap-2">
                        <Video className="h-4 w-4 text-sky-500 shrink-0" />

                        <a
                          href={
                            evento.enlace_virtual
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="
                            text-sky-600
                            dark:text-sky-400
                            hover:underline
                            truncate
                          "
                        >
                          Abrir enlace virtual
                        </a>
                      </div>
                    )}
                  </div>

                  {/* -------------------------------------------------
                      RESPONSABLE / PARTICIPANTES
                      ------------------------------------------------- */}

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        px-2
                        py-1.5
                        rounded-lg
                        bg-white/70
                        dark:bg-slate-900/60
                        text-indigo-700
                        dark:text-indigo-300
                        border
                        border-indigo-100
                        dark:border-indigo-900/50
                      "
                    >
                      <User className="h-3.5 w-3.5" />

                      {evento.asignado?.nombre ||
                        "Sin responsable"}
                    </span>

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        px-2
                        py-1.5
                        rounded-lg
                        bg-white/70
                        dark:bg-slate-900/60
                        text-cyan-700
                        dark:text-cyan-300
                        border
                        border-cyan-100
                        dark:border-cyan-900/50
                      "
                    >
                      <Users className="h-3.5 w-3.5" />

                      {evento.participantes_detalle
                        ?.length || 0}{" "}
                      participante(s)
                    </span>
                  </div>

                  {/* -------------------------------------------------
                      PIE DE TARJETA
                      ------------------------------------------------- */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-t
                      border-slate-200/70
                      dark:border-slate-700/70
                      pt-3
                    "
                  >
                    <span
                      className="
                        text-[11px]
                        text-slate-500
                        dark:text-slate-400
                        inline-flex
                        items-center
                        gap-1
                      "
                    >
                      <Bell className="h-3.5 w-3.5" />

                      {evento.recordatorio_minutos ??
                        15}{" "}
                      min antes
                    </span>

                    <button
                      onClick={() =>
                        setDetalle(evento)
                      }
                      className="
                        text-xs
                        font-bold
                        text-indigo-600
                        dark:text-indigo-400
                        hover:text-indigo-800
                        dark:hover:text-indigo-300
                      "
                    >
                      Ver detalle →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          MODAL CREAR / EDITAR
          
          CAMBIO IMPORTANTE:
          - Overlay desplazable
          - Dialog con altura máxima
          - Header fijo
          - Formulario desplazable
          - Botones accesibles
          ========================================================= */}

      {modalAbierto && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-slate-950/60
            backdrop-blur-sm
            overflow-y-auto
            p-3
            sm:p-4
          "
        >
          <div
            className="
              min-h-full
              flex
              items-center
              justify-center
            "
          >
            <div
              className="
                w-full
                max-w-2xl
                max-h-[calc(100vh-1.5rem)]
                sm:max-h-[calc(100vh-2rem)]
                flex
                flex-col
                overflow-hidden
                bg-white
                dark:bg-slate-900
                rounded-3xl
                shadow-2xl
                border
                border-slate-200
                dark:border-slate-800
              "
            >

              {/* -----------------------------------------------------
                  HEADER FIJO
                  ----------------------------------------------------- */}

              <div
                className="
                  shrink-0
                  z-10
                  bg-white
                  dark:bg-slate-900
                  p-4
                  sm:p-5
                  border-b
                  border-slate-200
                  dark:border-slate-800
                  flex
                  justify-between
                  items-start
                  gap-4
                "
              >
                <div className="min-w-0">
                  <h2
                    className="
                      text-lg
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    {editandoId
                      ? "Editar evento institucional"
                      : "Nuevo evento institucional"}
                  </h2>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                      mt-1
                    "
                  >
                    Completa la información para que
                    los involucrados conozcan qué,
                    cuándo y dónde ocurrirá.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModalAbierto(false)
                  }
                  className="
                    p-2
                    rounded-xl
                    hover:bg-slate-100
                    dark:hover:bg-slate-800
                    text-slate-500
                    dark:text-slate-300
                    shrink-0
                  "
                  aria-label="Cerrar formulario"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* -----------------------------------------------------
                  CUERPO DESPLAZABLE
                  ----------------------------------------------------- */}

              <form
                onSubmit={guardar}
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                  overscroll-contain
                  p-4
                  sm:p-5
                  space-y-5
                "
              >

                {/* TÍTULO */}

                <div>
                  <label
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Título del evento *
                  </label>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Nombre corto que aparecerá en la
                    agenda y en las notificaciones.
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
                    placeholder="Ej. Junta directiva mensual"
                    className="
                      w-full
                      px-3
                      py-2.5
                      rounded-xl
                      border
                      bg-slate-50
                      dark:bg-slate-800
                      border-slate-200
                      dark:border-slate-700
                      text-slate-900
                      dark:text-white
                      text-sm
                      outline-none
                      focus:ring-2
                      focus:ring-indigo-500
                    "
                  />
                </div>

                {/* TIPO / PRIORIDAD */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Tipo de evento *
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Clasifica la actividad para
                      facilitar su organización.
                    </p>

                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tipo:
                            e.target.value,
                        })
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    >
                      <option>
                        Reunión
                      </option>

                      <option>
                        Hito
                      </option>

                      <option>
                        Comité
                      </option>

                      <option>
                        Recordatorio
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Prioridad *
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Indica qué tan importante es
                      atender este evento.
                    </p>

                    <select
                      value={form.prioridad}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          prioridad:
                            e.target.value,
                        })
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    >
                      <option value="baja">
                        Baja
                      </option>

                      <option value="media">
                        Media
                      </option>

                      <option value="alta">
                        Alta
                      </option>
                    </select>
                  </div>
                </div>

                {/* DESCRIPCIÓN */}

                <div>
                  <label
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Descripción
                  </label>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Agenda, objetivos, instrucciones,
                    temas a tratar o información que
                    deban conocer los participantes.
                  </p>

                  <textarea
                    rows={4}
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descripcion:
                          e.target.value,
                      })
                    }
                    placeholder="Ej. Revisar presupuesto, aprobar acta y definir próximos compromisos..."
                    className="
                      w-full
                      px-3
                      py-2.5
                      rounded-xl
                      border
                      bg-slate-50
                      dark:bg-slate-800
                      border-slate-200
                      dark:border-slate-700
                      text-slate-900
                      dark:text-white
                      text-sm
                      outline-none
                      focus:ring-2
                      focus:ring-indigo-500
                      resize-y
                    "
                  />
                </div>

                {/* CUÁNDO */}

                <div
                  className="
                    rounded-2xl
                    bg-indigo-50
                    dark:bg-indigo-950/20
                    p-4
                    border
                    border-indigo-100
                    dark:border-indigo-900/50
                  "
                >
                  <div
                    className="
                      text-sm
                      font-bold
                      text-indigo-900
                      dark:text-indigo-200
                      mb-3
                    "
                  >
                    ¿Cuándo ocurre?
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      gap-4
                    "
                  >
                    <div>
                      <label
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Inicio *
                      </label>

                      <p className="text-[11px] text-slate-500 mb-2">
                        Fecha y hora en que comienza
                        la actividad.
                      </p>

                      <input
                        required
                        type="datetime-local"
                        value={
                          form.fecha_inicio
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            fecha_inicio:
                              e.target.value,
                          })
                        }
                        className="
                          w-full
                          px-3
                          py-2.5
                          rounded-xl
                          border
                          bg-white
                          dark:bg-slate-800
                          border-slate-200
                          dark:border-slate-700
                          text-slate-900
                          dark:text-white
                          text-sm
                        "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Finalización
                      </label>

                      <p className="text-[11px] text-slate-500 mb-2">
                        Fecha y hora en que termina.
                        Puede quedar vacía si no aplica.
                      </p>

                      <input
                        type="datetime-local"
                        value={
                          form.fecha_fin
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            fecha_fin:
                              e.target.value,
                          })
                        }
                        className="
                          w-full
                          px-3
                          py-2.5
                          rounded-xl
                          border
                          bg-white
                          dark:bg-slate-800
                          border-slate-200
                          dark:border-slate-700
                          text-slate-900
                          dark:text-white
                          text-sm
                        "
                      />
                    </div>
                  </div>

                  <label
                    className="
                      mt-4
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-900
                      dark:text-white
                      cursor-pointer
                    "
                  >
                    <input
                      type="checkbox"
                      checked={
                        form.todo_el_dia
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          todo_el_dia:
                            e.target.checked,
                        })
                      }
                    />

                    Actividad de todo el día
                  </label>
                </div>

                {/* UBICACIÓN / ENLACE */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Ubicación física
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Lugar donde se realizará
                      presencialmente.
                    </p>

                    <input
                      value={form.ubicacion}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ubicacion:
                            e.target.value,
                        })
                      }
                      placeholder="Ej. Sala de juntas principal"
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    />
                  </div>

                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Enlace virtual
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      URL de Teams, Meet, Zoom u
                      otra plataforma.
                    </p>

                    <input
                      type="url"
                      value={
                        form.enlace_virtual
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          enlace_virtual:
                            e.target.value,
                        })
                      }
                      placeholder="https://meet.google.com/..."
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    />
                  </div>
                </div>

                {/* RESPONSABLE */}

                <div>
                  <label
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Responsable
                  </label>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Usuario que tendrá la
                    responsabilidad principal sobre la
                    actividad y recibirá la
                    notificación correspondiente.
                  </p>

                  <select
                    value={form.asignado_a}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        asignado_a:
                          e.target.value,
                      })
                    }
                    className="
                      w-full
                      px-3
                      py-2.5
                      rounded-xl
                      border
                      bg-slate-50
                      dark:bg-slate-800
                      border-slate-200
                      dark:border-slate-700
                      text-slate-900
                      dark:text-white
                      text-sm
                    "
                  >
                    <option value="">
                      Sin responsable
                    </option>

                    {usuarios.map((u) => (
                      <option
                        key={u.id}
                        value={u.id}
                      >
                        {nombreUsuario(u)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PARTICIPANTES */}

                <div>
                  <label
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Participantes
                  </label>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Selecciona las personas que deben
                    conocer o participar en la actividad.
                    Recibirán una notificación.
                  </p>

                  <div
                    className="
                      max-h-40
                      overflow-y-auto
                      rounded-xl
                      border
                      border-slate-200
                      dark:border-slate-700
                      divide-y
                      dark:divide-slate-700
                    "
                  >
                    {usuarios.map((u) => (
                      <label
                        key={u.id}
                        className="
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          cursor-pointer
                          hover:bg-slate-50
                          dark:hover:bg-slate-800
                        "
                      >
                        <input
                          type="checkbox"
                          checked={form.participantes.includes(
                            u.id
                          )}
                          onChange={() =>
                            toggleParticipante(
                              u.id
                            )
                          }
                        />

                        <span
                          className="
                            text-sm
                            text-slate-800
                            dark:text-slate-200
                          "
                        >
                          {nombreUsuario(u)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* RECORDATORIO / ESTADO */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Recordatorio
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Minutos antes del inicio en los
                      que se preparará el recordatorio.
                    </p>

                    <input
                      min={0}
                      type="number"
                      value={
                        form.recordatorio_minutos
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          recordatorio_minutos:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    />
                  </div>

                  <div>
                    <label
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Estado
                    </label>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Situación actual de la actividad.
                    </p>

                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estado:
                            e.target.value,
                        })
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        border
                        bg-slate-50
                        dark:bg-slate-800
                        border-slate-200
                        dark:border-slate-700
                        text-slate-900
                        dark:text-white
                        text-sm
                      "
                    >
                      <option value="pendiente">
                        Pendiente
                      </option>

                      <option value="en_curso">
                        En curso
                      </option>

                      <option value="completado">
                        Completado
                      </option>

                      <option value="cancelado">
                        Cancelado
                      </option>
                    </select>
                  </div>
                </div>

                {/* ---------------------------------------------------
                    BOTONES
                    --------------------------------------------------- */}

                <div
                  className="
                    sticky
                    bottom-0
                    -mx-4
                    sm:-mx-5
                    px-4
                    sm:px-5
                    py-4
                    bg-white/95
                    dark:bg-slate-900/95
                    backdrop-blur
                    border-t
                    border-slate-200
                    dark:border-slate-800
                    flex
                    flex-col-reverse
                    sm:flex-row
                    sm:justify-end
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      setModalAbierto(false)
                    }
                    className="
                      px-4
                      py-2.5
                      rounded-xl
                      bg-slate-100
                      dark:bg-slate-800
                      text-slate-700
                      dark:text-slate-200
                      text-sm
                      font-semibold
                      hover:bg-slate-200
                      dark:hover:bg-slate-700
                      transition
                    "
                  >
                    Cancelar
                  </button>

                  <button
                    disabled={guardando}
                    type="submit"
                    className="
                      px-5
                      py-2.5
                      rounded-xl
                      bg-indigo-600
                      hover:bg-indigo-700
                      disabled:opacity-60
                      disabled:cursor-not-allowed
                      text-white
                      text-sm
                      font-bold
                      flex
                      items-center
                      justify-center
                      gap-2
                      transition
                    "
                  >
                    {guardando && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    {editandoId
                      ? "Guardar cambios"
                      : "Crear evento"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DETALLE
          ========================================================= */}

      {detalle && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-slate-950/60
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
            overflow-y-auto
          "
        >
          <div
            className="
              w-full
              max-w-xl
              max-h-[90vh]
              overflow-y-auto
              bg-white
              dark:bg-slate-900
              rounded-3xl
              shadow-2xl
              border
              border-slate-200
              dark:border-slate-800
              p-6
              space-y-5
            "
          >
            <div
              className="
                flex
                justify-between
                gap-4
              "
            >
              <div>
                <div className="flex gap-2 mb-2 flex-wrap">

                  <span
                    className="
                      px-2
                      py-1
                      rounded-lg
                      bg-slate-100
                      dark:bg-slate-800
                      text-slate-700
                      dark:text-slate-300
                      text-xs
                      font-bold
                    "
                  >
                    {detalle.tipo}
                  </span>

                  <span
                    className={`
                      px-2
                      py-1
                      rounded-lg
                      border
                      text-xs
                      font-bold
                      ${prioridadClass(
                        detalle.prioridad
                      )}
                    `}
                  >
                    {detalle.prioridad ||
                      "media"}
                  </span>

                  <span
                    className={`
                      px-2
                      py-1
                      rounded-lg
                      border
                      text-xs
                      font-bold
                      ${estadoClass(
                        detalle.estado
                      )}
                    `}
                  >
                    {(
                      detalle.estado ||
                      "pendiente"
                    ).replace(
                      "_",
                      " "
                    )}
                  </span>
                </div>

                <h2
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                    dark:text-white
                    break-words
                  "
                >
                  {detalle.titulo}
                </h2>
              </div>

              <button
                onClick={() =>
                  setDetalle(null)
                }
                className="
                  p-2
                  rounded-xl
                  hover:bg-slate-100
                  dark:hover:bg-slate-800
                  text-slate-500
                  dark:text-slate-300
                  shrink-0
                "
                aria-label="Cerrar detalle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p
              className="
                text-sm
                text-slate-600
                dark:text-slate-300
                whitespace-pre-wrap
                break-words
              "
            >
              {detalle.descripcion ||
                "Sin descripción."}
            </p>

            <div
              className="
                grid
                gap-3
                text-sm
                text-slate-600
                dark:text-slate-300
              "
            >
              <div className="flex gap-2">
                <Clock className="h-4 w-4 text-indigo-500 shrink-0" />

                <span>
                  {fechaLocal(
                    detalle.fecha_inicio,
                    Boolean(
                      detalle.todo_el_dia
                    )
                  )}

                  {detalle.fecha_fin
                    ? ` — ${fechaLocal(
                        detalle.fecha_fin
                      )}`
                    : ""}
                </span>
              </div>

              {detalle.ubicacion && (
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-amber-500 shrink-0" />

                  <span className="break-words">
                    {detalle.ubicacion}
                  </span>
                </div>
              )}

              {detalle.enlace_virtual && (
                <a
                  className="
                    flex
                    gap-2
                    text-sky-600
                    dark:text-sky-400
                    hover:underline
                  "
                  href={
                    detalle.enlace_virtual
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video className="h-4 w-4 shrink-0" />

                  Abrir reunión virtual
                </a>
              )}

              <div className="flex gap-2">
                <User className="h-4 w-4 text-indigo-500 shrink-0" />

                <span>
                  Responsable:{" "}
                  {detalle.asignado
                    ?.nombre ||
                    "Sin responsable"}
                </span>
              </div>

              <div className="flex gap-2">
                <Users className="h-4 w-4 text-cyan-500 shrink-0" />

                <span className="break-words">
                  Participantes:{" "}
                  {detalle
                    .participantes_detalle
                    ?.map(
                      (p) => p.nombre
                    )
                    .join(", ") ||
                    "Ninguno"}
                </span>
              </div>

              <div className="flex gap-2">
                <Bell className="h-4 w-4 text-amber-500 shrink-0" />

                <span>
                  Recordatorio:{" "}
                  {detalle.recordatorio_minutos ??
                    15}{" "}
                  minutos antes
                </span>
              </div>
            </div>

            <div
              className="
                flex
                flex-wrap
                justify-end
                gap-2
                border-t
                border-slate-200
                dark:border-slate-800
                pt-4
              "
            >
              <button
                onClick={() =>
                  abrirEditar(detalle)
                }
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-indigo-50
                  text-indigo-700
                  dark:bg-indigo-950/30
                  dark:text-indigo-300
                  text-xs
                  font-bold
                  inline-flex
                  gap-1.5
                  items-center
                "
              >
                <Pencil className="h-3.5 w-3.5" />

                Editar
              </button>

              <button
                onClick={() =>
                  cambiarEstado(
                    detalle,
                    "en_curso"
                  )
                }
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-cyan-50
                  text-cyan-700
                  dark:bg-cyan-950/30
                  dark:text-cyan-300
                  text-xs
                  font-bold
                  inline-flex
                  gap-1.5
                  items-center
                "
              >
                <CircleDot className="h-3.5 w-3.5" />

                En curso
              </button>

              <button
                onClick={() =>
                  cambiarEstado(
                    detalle,
                    "completado"
                  )
                }
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-emerald-50
                  text-emerald-700
                  dark:bg-emerald-950/30
                  dark:text-emerald-300
                  text-xs
                  font-bold
                  inline-flex
                  gap-1.5
                  items-center
                "
              >
                <CheckCircle2 className="h-3.5 w-3.5" />

                Completar
              </button>

              <button
                onClick={() =>
                  cambiarEstado(
                    detalle,
                    "cancelado"
                  )
                }
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-rose-50
                  text-rose-700
                  dark:bg-rose-950/30
                  dark:text-rose-300
                  text-xs
                  font-bold
                  inline-flex
                  gap-1.5
                  items-center
                "
              >
                <Ban className="h-3.5 w-3.5" />

                Cancelar
              </button>

              <button
                onClick={() =>
                  eliminar(detalle)
                }
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-slate-100
                  dark:bg-slate-800
                  text-slate-700
                  dark:text-slate-200
                  text-xs
                  font-bold
                  inline-flex
                  gap-1.5
                  items-center
                "
              >
                <Trash2 className="h-3.5 w-3.5" />

                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}