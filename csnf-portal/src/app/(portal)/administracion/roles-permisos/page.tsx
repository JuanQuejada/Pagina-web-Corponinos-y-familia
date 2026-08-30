"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Shield,
  ShieldPlus,
  Search,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Edit,
  Power,
  Lock,
  ListOrdered,
  Tag,
  Eye,
  KeyRound,
  Check,
  ChevronDown,
  ChevronRight,
  Save,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* ============================================================
   TIPOS
============================================================ */

interface Rol {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  nivel: number | null;
  activo: boolean | null;
  orden: number | null;
  editable: boolean | null;
  created_at: string | null;
}

interface Permiso {
  id: string;
  codigo: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
  activo: boolean | null;
  modulo_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/* ============================================================
   TIPOS DE MENSAJES
============================================================ */

type Mensaje =
  | {
      tipo: "exito" | "error";
      texto: string;
    }
  | null;

/* ============================================================
   FORMULARIO ROL
============================================================ */

const formularioInicial = {
  id: "",
  nombre: "",
  codigo: "",
  descripcion: "",
  nivel: 1,
  activo: true,
  orden: 1,
  editable: true,
};

/* ============================================================
   AUTENTICACIÓN
============================================================ */

async function authHeaders() {
  const {
    data,
  } =
    await supabase.auth.getSession();

  const token =
    data.session?.access_token;

  if (!token) {
    throw new Error(
      "Sesión no válida."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
    "Content-Type":
      "application/json",
  };
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ModuloRolesPage() {
  /* ----------------------------------------------------------
     ROLES
  ---------------------------------------------------------- */

  const [
    roles,
    setRoles,
  ] = useState<Rol[]>([]);

  const [
    permisos,
    setPermisos,
  ] = useState<Permiso[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  /* ----------------------------------------------------------
     MODAL ROL
  ---------------------------------------------------------- */

  const [
    modalRolAbierto,
    setModalRolAbierto,
  ] = useState(false);

  const [
    modoEdicion,
    setModoEdicion,
  ] = useState(false);

  const [
    guardandoRol,
    setGuardandoRol,
  ] = useState(false);

  const [
    mensajeRol,
    setMensajeRol,
  ] = useState<Mensaje>(null);

  const [
    formData,
    setFormData,
  ] =
    useState(
      formularioInicial
    );

  /* ----------------------------------------------------------
     MODAL PERMISOS
  ---------------------------------------------------------- */

  const [
    modalPermisosAbierto,
    setModalPermisosAbierto,
  ] = useState(false);

  const [
    rolPermisos,
    setRolPermisos,
  ] = useState<Rol | null>(
    null
  );

  const [
    permisosSeleccionados,
    setPermisosSeleccionados,
  ] = useState<
    string[]
  >([]);

  const [
    cargandoPermisos,
    setCargandoPermisos,
  ] = useState(false);

  const [
    guardandoPermisos,
    setGuardandoPermisos,
  ] = useState(false);

  const [
    busquedaPermiso,
    setBusquedaPermiso,
  ] = useState("");

  const [
    mensajePermisos,
    setMensajePermisos,
  ] = useState<Mensaje>(null);

  const [
    modulosAbiertos,
    setModulosAbiertos,
  ] = useState<
    Record<
      string,
      boolean
    >
  >({});

  /* ==========================================================
     CARGAR ROLES Y PERMISOS
  ========================================================== */

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const headers =
        await authHeaders();

      const response =
        await fetch(
          "/api/roles-permisos",
          {
            method: "GET",
            cache: "no-store",
            headers,
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cargar los roles y permisos."
        );
      }

      setRoles(
        Array.isArray(
          data.roles
        )
          ? data.roles
          : []
      );

      setPermisos(
        Array.isArray(
          data.permisos
        )
          ? data.permisos
          : []
      );
    } catch (
      e: any
    ) {
      console.error(
        "Error cargando roles y permisos:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cargar los roles y permisos."
      );

      setRoles([]);
      setPermisos([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  /* ==========================================================
     FORMULARIO
  ========================================================== */

  function resetFormulario() {
    setFormData(
      formularioInicial
    );

    setModoEdicion(
      false
    );

    setMensajeRol(
      null
    );
  }

  function abrirNuevoRol() {
    resetFormulario();
    setModalRolAbierto(
      true
    );
  }

  function abrirEditar(
    rol: Rol
  ) {
    setModoEdicion(
      true
    );

    setMensajeRol(
      null
    );

    setFormData({
      id:
        rol.id,

      nombre:
        rol.nombre,

      codigo:
        rol.codigo ||
        "",

      descripcion:
        rol.descripcion ||
        "",

      nivel:
        rol.nivel ??
        1,

      activo:
        rol.activo ??
        true,

      orden:
        rol.orden ??
        1,

      editable:
        rol.editable ??
        true,
    });

    setModalRolAbierto(
      true
    );
  }

  function cerrarModalRol() {
    if (
      guardandoRol
    ) {
      return;
    }

    setModalRolAbierto(
      false
    );

    resetFormulario();
  }

  function handleFormulario(
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >
  ) {
    const {
      name,
      value,
      type,
    } = event.target;

    if (
      type ===
      "checkbox"
    ) {
      const checked =
        (
          event.target as HTMLInputElement
        ).checked;

      setFormData(
        (actual) => ({
          ...actual,
          [name]:
            checked,
        })
      );

      return;
    }

    if (
      name ===
        "nivel" ||
      name ===
        "orden"
    ) {
      setFormData(
        (actual) => ({
          ...actual,
          [name]:
            Number(value) ||
            0,
        })
      );

      return;
    }

    setFormData(
      (actual) => ({
        ...actual,
        [name]:
          value,
      })
    );
  }

  /* ==========================================================
     GUARDAR ROL
  ========================================================== */

  async function guardarRol(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMensajeRol(
      null
    );

    if (
      !formData.nombre.trim()
    ) {
      setMensajeRol({
        tipo:
          "error",
        texto:
          "El nombre del rol es obligatorio.",
      });

      return;
    }

    if (
      !formData.codigo.trim()
    ) {
      setMensajeRol({
        tipo:
          "error",
        texto:
          "El código del rol es obligatorio.",
      });

      return;
    }

    setGuardandoRol(
      true
    );

    try {
      const headers =
        await authHeaders();

      const payload = {
        id:
          formData.id ||
          undefined,

        nombre:
          formData.nombre.trim(),

        codigo:
          formData.codigo
            .trim()
            .toUpperCase(),

        descripcion:
          formData.descripcion.trim(),

        nivel:
          formData.nivel,

        activo:
          formData.activo,

        orden:
          formData.orden,

        editable:
          formData.editable,
      };

      const response =
        await fetch(
          "/api/roles-permisos",
          {
            method:
              modoEdicion
                ? "PUT"
                : "POST",

            headers,

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible guardar el rol."
        );
      }

      setMensajeRol({
        tipo:
          "exito",
        texto:
          data.message ||
          "Rol guardado correctamente.",
      });

      await cargarDatos();

      setTimeout(
        () => {
          setModalRolAbierto(
            false
          );

          resetFormulario();
        },
        800
      );
    } catch (
      e: any
    ) {
      console.error(
        "Error guardando rol:",
        e
      );

      setMensajeRol({
        tipo:
          "error",
        texto:
          e?.message ||
          "No fue posible guardar el rol.",
      });
    } finally {
      setGuardandoRol(
        false
      );
    }
  }

  /* ==========================================================
     CAMBIAR ESTADO
  ========================================================== */

  async function toggleEstado(
    rol: Rol
  ) {
    try {
      const headers =
        await authHeaders();

      const response =
        await fetch(
          "/api/roles-permisos",
          {
            method:
              "PATCH",

            headers,

            body:
              JSON.stringify({
                id:
                  rol.id,

                activo:
                  !rol.activo,
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cambiar el estado del rol."
        );
      }

      await cargarDatos();
    } catch (
      e: any
    ) {
      console.error(
        "Error cambiando estado:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cambiar el estado del rol."
      );
    }
  }

  /* ==========================================================
     ABRIR PERMISOS
  ========================================================== */

  async function abrirPermisos(
    rol: Rol
  ) {
    setRolPermisos(
      rol
    );

    setModalPermisosAbierto(
      true
    );

    setCargandoPermisos(
      true
    );

    setMensajePermisos(
      null
    );

    setBusquedaPermiso(
      ""
    );

    try {
      const headers =
        await authHeaders();

      const response =
        await fetch(
          `/api/roles-permisos?rol_id=${encodeURIComponent(
            rol.id
          )}`,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers,
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cargar los permisos del rol."
        );
      }

      setPermisos(
        Array.isArray(
          data.permisos
        )
          ? data.permisos
          : []
      );

      setPermisosSeleccionados(
        Array.isArray(
          data.permisos_asignados
        )
          ? data.permisos_asignados
          : []
      );

      /* --------------------------------------------------------
         Abrimos inicialmente todos los módulos.
      -------------------------------------------------------- */

      const abiertos: Record<
        string,
        boolean
      > = {};

      (
        Array.isArray(
          data.permisos
        )
          ? data.permisos
          : []
      ).forEach(
        (
          permiso: Permiso
        ) => {
          abiertos[
            permiso.modulo
          ] = true;
        }
      );

      setModulosAbiertos(
        abiertos
      );
    } catch (
      e: any
    ) {
      console.error(
        "Error cargando permisos:",
        e
      );

      setMensajePermisos({
        tipo:
          "error",
        texto:
          e?.message ||
          "No fue posible cargar los permisos.",
      });

      setPermisosSeleccionados(
        []
      );
    } finally {
      setCargandoPermisos(
        false
      );
    }
  }

  function cerrarModalPermisos() {
    if (
      guardandoPermisos
    ) {
      return;
    }

    setModalPermisosAbierto(
      false
    );

    setRolPermisos(
      null
    );

    setPermisosSeleccionados(
      []
    );

    setMensajePermisos(
      null
    );
  }

  /* ==========================================================
     AGRUPAR PERMISOS
  ========================================================== */

  const permisosFiltrados =
    useMemo(() => {
      const q =
        busquedaPermiso
          .trim()
          .toLowerCase();

      if (!q) {
        return permisos;
      }

      return permisos.filter(
        (
          permiso
        ) =>
          [
            permiso.codigo,
            permiso.modulo,
            permiso.accion,
            permiso.descripcion ||
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)
      );
    }, [
      permisos,
      busquedaPermiso,
    ]);

  const permisosPorModulo =
    useMemo(() => {
      const mapa: Record<
        string,
        Permiso[]
      > = {};

      permisosFiltrados.forEach(
        (
          permiso
        ) => {
          const modulo =
            permiso.modulo ||
            "Sin módulo";

          if (
            !mapa[modulo]
          ) {
            mapa[modulo] =
              [];
          }

          mapa[
            modulo
          ].push(
            permiso
          );
        }
      );

      return mapa;
    }, [
      permisosFiltrados,
    ]);

  const modulos =
    Object.keys(
      permisosPorModulo
    ).sort(
      (
        a,
        b
      ) =>
        a.localeCompare(
          b
        )
    );

  /* ==========================================================
     SELECCIÓN DE PERMISOS
  ========================================================== */

  function alternarPermiso(
    permisoId: string
  ) {
    setPermisosSeleccionados(
      (
        actuales
      ) => {
        if (
          actuales.includes(
            permisoId
          )
        ) {
          return actuales.filter(
            (id) =>
              id !==
              permisoId
          );
        }

        return [
          ...actuales,
          permisoId,
        ];
      }
    );
  }

  function obtenerIdsModulo(
    modulo: string
  ) {
    return (
      permisosPorModulo[
        modulo
      ] || []
    ).map(
      (
        permiso
      ) =>
        permiso.id
    );
  }

  function moduloSeleccionadoCompleto(
    modulo: string
  ) {
    const ids =
      obtenerIdsModulo(
        modulo
      );

    if (
      ids.length ===
      0
    ) {
      return false;
    }

    return ids.every(
      (
        id
      ) =>
        permisosSeleccionados.includes(
          id
        )
    );
  }

  function alternarModulo(
    modulo: string
  ) {
    const ids =
      obtenerIdsModulo(
        modulo
      );

    setPermisosSeleccionados(
      (
        actuales
      ) => {
        const todos =
          ids.every(
            (
              id
            ) =>
              actuales.includes(
                id
              )
          );

        if (
          todos
        ) {
          return actuales.filter(
            (
              id
            ) =>
              !ids.includes(
                id
              )
          );
        }

        return Array.from(
          new Set([
            ...actuales,
            ...ids,
          ])
        );
      }
    );
  }

  function todosSeleccionados() {
    const ids =
      permisosFiltrados.map(
        (
          permiso
        ) =>
          permiso.id
      );

    return (
      ids.length >
        0 &&
      ids.every(
        (
          id
        ) =>
          permisosSeleccionados.includes(
            id
          )
      )
    );
  }

  function alternarTodos() {
    const ids =
      permisosFiltrados.map(
        (
          permiso
        ) =>
          permiso.id
      );

    setPermisosSeleccionados(
      (
        actuales
      ) => {
        const todos =
          ids.every(
            (
              id
            ) =>
              actuales.includes(
                id
              )
          );

        if (
          todos
        ) {
          return actuales.filter(
            (
              id
            ) =>
              !ids.includes(
                id
              )
          );
        }

        return Array.from(
          new Set([
            ...actuales,
            ...ids,
          ])
        );
      }
    );
  }

  function toggleModuloAbierto(
    modulo: string
  ) {
    setModulosAbiertos(
      (
        actuales
      ) => ({
        ...actuales,
        [modulo]:
          !actuales[
            modulo
          ],
      })
    );
  }

  /* ==========================================================
     GUARDAR PERMISOS
  ========================================================== */

  async function guardarPermisos() {
    if (
      !rolPermisos
    ) {
      return;
    }

    setGuardandoPermisos(
      true
    );

    setMensajePermisos(
      null
    );

    try {
      const headers =
        await authHeaders();

      const response =
        await fetch(
          "/api/roles-permisos",
          {
            method:
              "DELETE",

            headers,

            body:
              JSON.stringify({
                rol_id:
                  rolPermisos.id,

                permiso_ids:
                  permisosSeleccionados,
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible guardar los permisos."
        );
      }

      setMensajePermisos({
        tipo:
          "exito",
        texto:
          data.message ||
          "Permisos actualizados correctamente.",
      });

      await cargarDatos();

      setTimeout(
        () => {
          cerrarModalPermisos();
        },
        900
      );
    } catch (
      e: any
    ) {
      console.error(
        "Error guardando permisos:",
        e
      );

      setMensajePermisos({
        tipo:
          "error",
        texto:
          e?.message ||
          "No fue posible guardar los permisos.",
      });
    } finally {
      setGuardandoPermisos(
        false
      );
    }
  }

  /* ==========================================================
     FILTRO ROLES
  ========================================================== */

  const rolesFiltrados =
    useMemo(() => {
      const q =
        busqueda
          .trim()
          .toLowerCase();

      if (!q) {
        return roles;
      }

      return roles.filter(
        (
          rol
        ) =>
          [
            rol.nombre,
            rol.codigo ||
              "",
            rol.descripcion ||
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)
      );
    }, [
      roles,
      busqueda,
    ]);

  /* ==========================================================
     CONTADOR DE PERMISOS POR ROL
  ========================================================== */

  const [
    cantidadesPermisos,
    setCantidadesPermisos,
  ] = useState<
    Record<
      string,
      number
    >
  >({});

  async function cargarCantidadPermisos(
    listaRoles: Rol[]
  ) {
    try {
      const headers =
        await authHeaders();

      const resultado: Record<
        string,
        number
      > = {};

      await Promise.all(
        listaRoles.map(
          async (
            rol
          ) => {
            try {
              const response =
                await fetch(
                  `/api/roles-permisos?rol_id=${encodeURIComponent(
                    rol.id
                  )}`,
                  {
                    method:
                      "GET",

                    cache:
                      "no-store",

                    headers,
                  }
                );

              const data =
                await response
                  .json()
                  .catch(
                    () => ({})
                  );

              if (
                response.ok &&
                data.success
              ) {
                resultado[
                  rol.id
                ] =
                  Array.isArray(
                    data.permisos_asignados
                  )
                    ? data
                        .permisos_asignados
                        .length
                    : 0;
              }
            } catch {
              resultado[
                rol.id
              ] = 0;
            }
          }
        )
      );

      setCantidadesPermisos(
        resultado
      );
    } catch {
      /* No bloqueamos el módulo
         si falla solamente el contador. */
    }
  }

  useEffect(() => {
    if (
      roles.length
    ) {
      cargarCantidadPermisos(
        roles
      );
    }
  }, [
    roles,
  ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              <Shield className="h-6 w-6 text-blue-600" />

              Roles y Permisos
            </h1>

            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Administración de roles, niveles de acceso y permisos del sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={
              abrirNuevoRol
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <ShieldPlus className="h-4 w-4" />

            Nuevo Rol
          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR GENERAL
      ====================================================== */}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">

          <AlertCircle className="h-4 w-4 shrink-0" />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>

        </div>
      )}

      {/* ======================================================
          BUSCADOR
      ====================================================== */}

      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={
              busqueda
            }
            onChange={(
              event
            ) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="Buscar por nombre, código o descripción..."
            className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
          />

        </div>

        <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:flex">
          <Users className="h-3.5 w-3.5" />

          {roles.length}{" "}
          {roles.length ===
          1
            ? "rol"
            : "roles"}
        </div>

      </div>

      {/* ======================================================
          TABLA
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {cargando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">

            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

            <p className="text-xs text-gray-400">
              Cargando roles y permisos...
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:bg-slate-800/60">

                <tr>

                  <th className="px-5 py-3.5">
                    ORDEN
                  </th>

                  <th className="px-5 py-3.5">
                    CÓDIGO
                  </th>

                  <th className="px-5 py-3.5">
                    ROL
                  </th>

                  <th className="px-5 py-3.5">
                    DESCRIPCIÓN
                  </th>

                  <th className="px-5 py-3.5">
                    PERMISOS
                  </th>

                  <th className="px-5 py-3.5">
                    ESTADO
                  </th>

                  <th className="px-5 py-3.5 text-right">
                    ACCIONES
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">

                {rolesFiltrados.length ===
                0 ? (
                  <tr>

                    <td
                      colSpan={
                        7
                      }
                      className="py-12 text-center text-xs text-gray-400"
                    >
                      No se encontraron roles registrados.
                    </td>

                  </tr>
                ) : (
                  rolesFiltrados.map(
                    (
                      rol
                    ) => (
                      <tr
                        key={
                          rol.id
                        }
                        className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >

                        <td className="px-5 py-4 font-bold text-blue-600">
                          {rol.orden ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">

                          <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {rol.codigo ||
                              "N/A"}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                              <Shield className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">

                              <p className="font-bold text-gray-900 dark:text-white">
                                {rol.nombre}
                              </p>

                              <p className="text-[10px] text-gray-400">
                                Nivel{" "}
                                {rol.nivel ??
                                  1}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="max-w-xs px-5 py-4">

                          <p className="truncate text-gray-500 dark:text-slate-400">
                            {rol.descripcion ||
                              "Sin descripción"}
                          </p>

                        </td>

                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              abrirPermisos(
                                rol
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/70"
                            title="Administrar permisos"
                          >

                            <KeyRound className="h-3.5 w-3.5" />

                            {cantidadesPermisos[
                              rol.id
                            ] ??
                              0}

                            <span className="hidden sm:inline">
                              permisos
                            </span>

                          </button>

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              rol.activo
                                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {rol.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex items-center justify-end gap-1">

                            {/* VISUALIZAR PERMISOS */}

                            <button
                              type="button"
                              onClick={() =>
                                abrirPermisos(
                                  rol
                                )
                              }
                              title="Visualizar y administrar permisos"
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* EDITAR */}

                            <button
                              type="button"
                              onClick={() =>
                                abrirEditar(
                                  rol
                                )
                              }
                              disabled={
                                rol.editable ===
                                false
                              }
                              title={
                                rol.editable ===
                                false
                                  ? "Rol no editable"
                                  : "Editar rol"
                              }
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {/* ESTADO */}

                            <button
                              type="button"
                              onClick={() =>
                                toggleEstado(
                                  rol
                                )
                              }
                              disabled={
                                rol.editable ===
                                false
                              }
                              title={
                                rol.activo
                                  ? "Desactivar rol"
                                  : "Activar rol"
                              }
                              className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                rol.activo
                                  ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
                                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Power className="h-4 w-4" />
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
        )}

      </div>

      {/* ======================================================
          MODAL ROL
      ====================================================== */}

      {modalRolAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-slate-800">

              <div>

                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">

                  <Shield className="h-5 w-5 text-blue-600" />

                  {modoEdicion
                    ? "Editar Rol"
                    : "Registrar Nuevo Rol"}

                </h2>

                <p className="mt-1 text-[10px] text-gray-400">
                  Configure la información general del rol.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  cerrarModalRol
                }
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={
                guardarRol
              }
              className="space-y-5 p-6"
            >

              {mensajeRol && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                    mensajeRol.tipo ===
                    "exito"
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                  }`}
                >

                  {mensajeRol.tipo ===
                  "exito" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}

                  {mensajeRol.texto}

                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    <Tag className="h-3 w-3" />
                    Nombre del Rol *
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    required
                    value={
                      formData.nombre
                    }
                    onChange={
                      handleFormulario
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                </div>

                <div>

                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    <Lock className="h-3 w-3" />
                    Código Interno *
                  </label>

                  <input
                    type="text"
                    name="codigo"
                    required
                    value={
                      formData.codigo
                    }
                    onChange={
                      handleFormulario
                    }
                    placeholder="ADMIN_CONTABLE"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                </div>

              </div>

              <div>

                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Descripción de Funciones
                </label>

                <textarea
                  name="descripcion"
                  rows={3}
                  value={
                    formData.descripcion
                  }
                  onChange={
                    handleFormulario
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    <ListOrdered className="h-3 w-3" />
                    Orden
                  </label>

                  <input
                    type="number"
                    min="1"
                    name="orden"
                    value={
                      formData.orden
                    }
                    onChange={
                      handleFormulario
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Nivel
                  </label>

                  <input
                    type="number"
                    min="1"
                    name="nivel"
                    value={
                      formData.nivel
                    }
                    onChange={
                      handleFormulario
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                </div>

              </div>

              <div className="flex flex-wrap gap-5 border-t border-gray-100 pt-4 dark:border-slate-800">

                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300">

                  <input
                    type="checkbox"
                    name="activo"
                    checked={
                      formData.activo
                    }
                    onChange={
                      handleFormulario
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />

                  Activo

                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300">

                  <input
                    type="checkbox"
                    name="editable"
                    checked={
                      formData.editable
                    }
                    onChange={
                      handleFormulario
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />

                  Editable

                </label>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">

                <button
                  type="button"
                  onClick={
                    cerrarModalRol
                  }
                  disabled={
                    guardandoRol
                  }
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardandoRol
                  }
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
                >

                  {guardandoRol && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  <span>
                    {modoEdicion
                      ? "Actualizar Rol"
                      : "Guardar Rol"}
                  </span>

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ======================================================
          MODAL PERMISOS
      ====================================================== */}

      {modalPermisosAbierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">

          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

            {/* HEADER */}

            <div className="shrink-0 border-b border-gray-100 p-5 dark:border-slate-800">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">

                    <KeyRound className="h-5 w-5 text-blue-600" />

                    Permisos del rol

                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2">

                    <span className="text-sm font-bold text-blue-600">
                      {rolPermisos?.nombre ||
                        "Rol"}
                    </span>

                    {rolPermisos?.codigo && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {
                          rolPermisos.codigo
                        }
                      </span>
                    )}

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    cerrarModalPermisos
                  }
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              {/* BUSCADOR */}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">

                <div className="relative flex-1">

                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={
                      busquedaPermiso
                    }
                    onChange={(
                      event
                    ) =>
                      setBusquedaPermiso(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Buscar permiso, módulo, acción..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                </div>

                <button
                  type="button"
                  onClick={
                    alternarTodos
                  }
                  disabled={
                    cargandoPermisos ||
                    permisosFiltrados.length ===
                      0
                  }
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
                >

                  <Check className="h-4 w-4" />

                  {todosSeleccionados()
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}

                </button>

              </div>

              <div className="mt-3 flex items-center justify-between">

                <p className="text-[10px] text-gray-400">

                  {permisosSeleccionados.length}{" "}
                  permisos seleccionados de{" "}
                  {permisos.length}

                </p>

                <p className="text-[10px] font-semibold text-gray-400">

                  {modulos.length}{" "}
                  módulos

                </p>

              </div>

            </div>

            {/* MENSAJE */}

            {mensajePermisos && (
              <div
                className={`mx-5 mt-4 flex shrink-0 items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                  mensajePermisos.tipo ===
                  "exito"
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                }`}
              >

                {mensajePermisos.tipo ===
                "exito" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}

                {mensajePermisos.texto}

              </div>
            )}

            {/* CONTENIDO */}

            <div className="min-h-0 flex-1 overflow-y-auto p-5">

              {cargandoPermisos ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">

                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

                  <p className="text-xs text-gray-400">
                    Cargando permisos...
                  </p>

                </div>
              ) : modulos.length ===
                0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-slate-700">

                  <KeyRound className="mx-auto h-8 w-8 text-gray-300" />

                  <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-slate-400">
                    No existen permisos activos.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {modulos.map(
                    (
                      modulo
                    ) => {
                      const lista =
                        permisosPorModulo[
                          modulo
                        ] || [];

                      const abierto =
                        modulosAbiertos[
                          modulo
                        ];

                      const completo =
                        moduloSeleccionadoCompleto(
                          modulo
                        );

                      return (
                        <div
                          key={
                            modulo
                          }
                          className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700"
                        >

                          {/* MÓDULO */}

                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 dark:bg-slate-800/70">

                            <button
                              type="button"
                              onClick={() =>
                                toggleModuloAbierto(
                                  modulo
                                )
                              }
                              className="flex flex-1 items-center gap-2 text-left"
                            >

                              {abierto ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}

                              <span className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-white">
                                {modulo}
                              </span>

                              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-gray-400 shadow-sm dark:bg-slate-900">
                                {lista.length}
                              </span>

                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                alternarModulo(
                                  modulo
                                )
                              }
                              className={`rounded-lg px-2.5 py-1.5 text-[9px] font-bold transition ${
                                completo
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-blue-950/40"
                              }`}
                            >

                              {completo
                                ? "Todos"
                                : "Seleccionar módulo"}

                            </button>

                          </div>

                          {/* PERMISOS */}

                          {abierto && (
                            <div className="divide-y divide-gray-100 dark:divide-slate-800">

                              {lista.map(
                                (
                                  permiso
                                ) => {
                                  const seleccionado =
                                    permisosSeleccionados.includes(
                                      permiso.id
                                    );

                                  return (
                                    <label
                                      key={
                                        permiso.id
                                      }
                                      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    >

                                      <div
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                          seleccionado
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                                        }`}
                                      >

                                        {seleccionado && (
                                          <Check className="h-3 w-3" />
                                        )}

                                      </div>

                                      <input
                                        type="checkbox"
                                        checked={
                                          seleccionado
                                        }
                                        onChange={() =>
                                          alternarPermiso(
                                            permiso.id
                                          )
                                        }
                                        className="sr-only"
                                      />

                                      <div className="min-w-0 flex-1">

                                        <div className="flex flex-wrap items-center gap-2">

                                          <span className="font-mono text-[10px] font-bold text-gray-700 dark:text-slate-200">
                                            {
                                              permiso.codigo
                                            }
                                          </span>

                                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            {
                                              permiso.accion
                                            }
                                          </span>

                                        </div>

                                        {permiso.descripcion && (
                                          <p className="mt-1 text-[10px] text-gray-400">
                                            {
                                              permiso.descripcion
                                            }
                                          </p>
                                        )}

                                      </div>

                                    </label>
                                  );
                                }
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">

              <div className="hidden items-center gap-2 sm:flex">

                <KeyRound className="h-4 w-4 text-blue-600" />

                <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">

                  {permisosSeleccionados.length}{" "}
                  seleccionados

                </span>

              </div>

              <div className="ml-auto flex items-center gap-3">

                <button
                  type="button"
                  onClick={
                    cerrarModalPermisos
                  }
                  disabled={
                    guardandoPermisos
                  }
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    guardarPermisos
                  }
                  disabled={
                    guardandoPermisos ||
                    cargandoPermisos ||
                    !rolPermisos
                  }
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {guardandoPermisos ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  Guardar permisos

                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}