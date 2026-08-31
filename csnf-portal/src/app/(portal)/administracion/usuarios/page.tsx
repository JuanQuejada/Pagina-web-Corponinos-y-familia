"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
} from "@/lib/supabase";

/* ============================================================
   TIPOS
============================================================ */

type Opcion = {
  id: string;
  codigo?: string | null;
  nombre: string;
  activo?: boolean;
  tipo_persona_id?: string | null;
  departamento_id?: string | null;
  nivel?: number | null;
};

type Departamento = Opcion & {
  codigo?: string | null;
};

type Cargo = Opcion & {
  departamento_id: string;

  departamento?: Departamento | null;
};

type Rol = Opcion & {
  nivel?: number | null;
};

type Usuario = {
  id: string;
  email: string;
  tipo_persona_id: string;
  tipo_identificacion_id: string;
  numero_identificacion: string;

  nombres?: string | null;
  apellidos?: string | null;
  razon_social?: string | null;

  telefono?: string | null;
  direccion?: string | null;

  estado_usuario_id: string;

  fecha_ingreso?: string | null;
  fecha_retiro?: string | null;

  cargo_id?: string | null;
  
  clave_repositorio?: string | null;
  puede_iniciar_flujos?: boolean;

  foto_url?: string | null;

  tipo_persona?: Opcion | null;
  tipo_identificacion?: Opcion | null;
  estado_usuario?: Opcion | null;


  cargo?: (Opcion & {
    departamento_id?: string | null;
    departamento?: Departamento | null;
  }) | null;

  asignacion_predeterminada?: {
    id: string;
    cargo_id?: string | null;
    rol_id?: string | null;
    activo?: boolean;
    perfil_predeterminado?: boolean;
    cargo?: Cargo | null;
    rol?: Rol | null;
  } | null;

  // Todas las asignaciones del usuario. La fuente de verdad para multicargos.
  asignaciones?: Array<{
    id: string;
    usuario_id: string;
    cargo_id?: string | null;
    rol_id?: string | null;
    activo?: boolean;
    perfil_predeterminado?: boolean;
    cargo?: (Cargo & {
      departamento?: (Departamento & {
        area?: Opcion | null;
      }) | null;
    }) | null;
    rol?: Rol | null;
  }>;
};

type Catalogos = {
  tiposPersona: Opcion[];
  tiposIdentificacion: Opcion[];
  departamentos: Departamento[];
  cargos: Cargo[];
  estadosUsuario: Opcion[];
  roles: Rol[];
};

type Formulario = {
  email: string;
  password: string;

  tipo_persona_id: string;
  tipo_identificacion_id: string;
  numero_identificacion: string;

  nombres: string;
  apellidos: string;
  razon_social: string;

  telefono: string;
  direccion: string;

  estado_usuario_id: string;

  fecha_ingreso: string;
  fecha_retiro: string;

  departamento_id: string;
  cargo_id: string;
  rol_id: string;

  perfil_predeterminado: boolean;

  clave_repositorio: string;
  puede_iniciar_flujos: boolean;
};

/* ============================================================
   FORMULARIO INICIAL
============================================================ */

const formularioInicial: Formulario = {
  email: "",
  password: "",

  tipo_persona_id: "",
  tipo_identificacion_id: "",
  numero_identificacion: "",

  nombres: "",
  apellidos: "",
  razon_social: "",

  telefono: "",
  direccion: "",

  estado_usuario_id: "",

  fecha_ingreso: "",
  fecha_retiro: "",

  departamento_id: "",
  cargo_id: "",
  rol_id: "",

  perfil_predeterminado: true,

  clave_repositorio: "",
  puede_iniciar_flujos: false,
};

/* ============================================================
   HELPERS
============================================================ */

function nombreUsuario(usuario: Usuario) {
  if (usuario.razon_social?.trim()) {
    return usuario.razon_social.trim();
  }

  return (
    `${usuario.nombres || ""} ${
      usuario.apellidos || ""
    }`.trim() || "Usuario"
  );
}

function inicialesUsuario(usuario: Usuario) {
  const nombre = nombreUsuario(usuario)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!nombre.length) return "U";

  if (nombre.length === 1) {
    return nombre[0].substring(0, 2).toUpperCase();
  }

  return (
    nombre[0][0] + nombre[1][0]
  ).toUpperCase();
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function usuarioEstaActivo(usuario: Usuario) {
  const estado = usuario.estado_usuario;

  const codigo = String(
    estado?.codigo || ""
  ).toUpperCase();

  const nombre = String(
    estado?.nombre || ""
  ).toLowerCase();

  return (
    codigo === "ACT" ||
    nombre === "activo"
  );
}

/* ============================================================
   AUTENTICACIÓN FRONTEND
============================================================ */

/**
 * Obtiene el access_token de la sesión actual.
 *
 * IMPORTANTE:
 * Todos los endpoints /api/usuarios están protegidos mediante
 * getProfileFromBearer(), por lo tanto debemos enviar:
 *
 * Authorization: Bearer <access_token>
 */
async function authHeaders(): Promise<
  Record<string, string>
> {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return {};
  }

  const token =
    data.session?.access_token;

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function UsuariosPage() {
  /* ----------------------------------------------------------
     DATOS
  ---------------------------------------------------------- */

  const [usuarios, setUsuarios] =
    useState<Usuario[]>([]);

  const [catalogos, setCatalogos] =
    useState<Catalogos>({
      tiposPersona: [],
      tiposIdentificacion: [],
      departamentos: [],
      cargos: [],
      estadosUsuario: [],
      roles: [],
    });

  /* ----------------------------------------------------------
     FILTROS
  ---------------------------------------------------------- */

  const [busqueda, setBusqueda] =
    useState("");

  const [soloActivos, setSoloActivos] =
    useState(false);

  /* ----------------------------------------------------------
     ESTADOS
  ---------------------------------------------------------- */

  const [cargando, setCargando] =
    useState(true);

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [modalAbierto, setModalAbierto] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [usuarioEditando, setUsuarioEditando] =
    useState<Usuario | null>(null);

  const [usuarioVisualizando,               setUsuarioVisualizando] =
    useState<Usuario | null>(null);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [confirmacion, setConfirmacion] =
    useState<{
      usuario: Usuario;
      activo: boolean;
    } | null>(null);

  /* ----------------------------------------------------------
     FORMULARIO
  ---------------------------------------------------------- */

  const [formulario, setFormulario] =
    useState<Formulario>(
      formularioInicial
    );

  /* ============================================================
     CARGAR CATÁLOGOS
  ============================================================ */

  async function cargarCatalogos() {
    try {
      setCargandoCatalogos(true);
      setError("");

      const headers =
        await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      /*
       * IMPORTANTE:
       *
       * La carpeta es:
       *
       * /api/usuarios/catalogo/route.ts
       *
       * Por lo tanto la URL correcta es:
       *
       * /api/usuarios/catalogo
       */
      const response =
        await fetch(
          "/api/usuarios/catalogo",
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cargar los catálogos."
        );
      }

      setCatalogos({
        tiposPersona:
          Array.isArray(
            data.tiposPersona
          )
            ? data.tiposPersona
            : [],

        tiposIdentificacion:
          Array.isArray(
            data.tiposIdentificacion
          )
            ? data.tiposIdentificacion
            : [],

        departamentos:
          Array.isArray(
            data.departamentos
          )
            ? data.departamentos
            : [],

        cargos:
          Array.isArray(data.cargos)
            ? data.cargos
            : [],

        estadosUsuario:
          Array.isArray(
            data.estadosUsuario
          )
            ? data.estadosUsuario
            : [],

        roles:
          Array.isArray(data.roles)
            ? data.roles
            : [],
      });
    } catch (e: any) {
      console.error(
        "Error cargando catálogos:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cargar los catálogos."
      );
    } finally {
      setCargandoCatalogos(false);
    }
  }

  /* ============================================================
     CARGAR USUARIOS
  ============================================================ */

  async function cargarUsuarios() {
    try {
      setCargando(true);
      setError("");

      const headers =
        await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      const params =
        new URLSearchParams();

      if (busqueda.trim()) {
        params.set(
          "busqueda",
          busqueda.trim()
        );
      }

      if (soloActivos) {
        params.set(
          "solo_activos",
          "true"
        );
      }

      /*
       * ESTE MÓDULO NO CONSUME /listar.
       *
       * /api/usuarios/listar queda reservado para
       * los módulos que ya lo utilizan, como los flujos.
       */
      const url =
        params.toString()
          ? `/api/usuarios?${params.toString()}`
          : "/api/usuarios";

      const response =
        await fetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
        });

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cargar los usuarios."
        );
      }

      setUsuarios(
        Array.isArray(data.usuarios)
          ? data.usuarios
          : []
      );
    } catch (e: any) {
      console.error(
        "Error cargando usuarios:",
        e
      );

      setUsuarios([]);

      setError(
        e?.message ||
          "No fue posible cargar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  }

  /* ============================================================
     EFECTOS
  ============================================================ */

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [
    busqueda,
    soloActivos,
  ]);

  /* ============================================================
     TIPO DE PERSONA
  ============================================================ */

  const tipoPersonaSeleccionado =
    useMemo(() => {
      return catalogos.tiposPersona.find(
        (item) =>
          item.id ===
          formulario.tipo_persona_id
      );
    }, [
      catalogos.tiposPersona,
      formulario.tipo_persona_id,
    ]);

  const esPersonaJuridica =
    useMemo(() => {
      if (
        !tipoPersonaSeleccionado
      ) {
        return false;
      }

      const codigo =
        String(
          tipoPersonaSeleccionado.codigo ||
            ""
        ).toUpperCase();

      const nombre =
        String(
          tipoPersonaSeleccionado.nombre ||
            ""
        ).toUpperCase();

      return (
        codigo.includes("JUR") ||
        nombre.includes("JURID") ||
        nombre.includes("EMPRESA")
      );
    }, [
      tipoPersonaSeleccionado,
    ]);

  /* ============================================================
     TIPOS DE IDENTIFICACIÓN FILTRADOS
  ============================================================ */

  const tiposIdentificacionFiltrados =
    useMemo(() => {
      if (
        !formulario.tipo_persona_id
      ) {
        return [];
      }

      return catalogos.tiposIdentificacion.filter(
        (item) =>
          !item.tipo_persona_id ||
          item.tipo_persona_id ===
            formulario.tipo_persona_id
      );
    }, [
      catalogos.tiposIdentificacion,
      formulario.tipo_persona_id,
    ]);

  /* ============================================================
     CARGOS FILTRADOS POR DEPARTAMENTO
  ============================================================ */

  const cargosFiltrados =
    useMemo(() => {
      if (
        !formulario.departamento_id
      ) {
        return [];
      }

      return catalogos.cargos.filter(
        (cargo) =>
          cargo.departamento_id ===
          formulario.departamento_id
      );
    }, [
      catalogos.cargos,
      formulario.departamento_id,
    ]);

  /* ============================================================
     ACTUALIZAR CAMPO
  ============================================================ */

  function actualizarCampo(
    campo: keyof Formulario,
    valor: string | boolean
  ) {
    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    );
  }

  /* ============================================================
     CAMBIAR TIPO PERSONA
  ============================================================ */

  function cambiarTipoPersona(
    valor: string
  ) {
    setFormulario(
      (actual) => ({
        ...actual,

        tipo_persona_id:
          valor,

        tipo_identificacion_id:
          "",

        nombres:
          "",

        apellidos:
          "",

        razon_social:
          "",
      })
    );
  }

  /* ============================================================
     CAMBIAR DEPARTAMENTO
  ============================================================ */

  function cambiarDepartamento(
  valor: string
) {
  setFormulario((actual) => {
    const cargoActual = catalogos.cargos.find(
      (cargo) =>
        cargo.id === actual.cargo_id
    );

    const cargoPerteneceAlDepartamento =
      cargoActual?.departamento_id === valor;

    return {
      ...actual,

      departamento_id: valor,

      cargo_id:
        cargoPerteneceAlDepartamento
          ? actual.cargo_id
          : "",
    };
  });
}

  /* ============================================================
     ABRIR CREAR
  ============================================================ */

  function abrirCrear() {
    setModoEdicion(false);

    setUsuarioEditando(null);

    const estadoActivo =
      catalogos.estadosUsuario.find(
        (estado) => {
          const codigo =
            String(
              estado.codigo || ""
            ).toUpperCase();

          const nombre =
            String(
              estado.nombre || ""
            ).toLowerCase();

          return (
            codigo === "ACT" ||
            nombre === "activo"
          );
        }
      );

    setFormulario({
      ...formularioInicial,

      estado_usuario_id:
        estadoActivo?.id || "",

      fecha_ingreso:
        new Date()
          .toISOString()
          .split("T")[0],
    });

    setError("");
    setMensaje("");

    setModalAbierto(true);
  }

  /* ============================================================
   VISUALIZAR USUARIO
  ============================================================ */

  function abrirVisualizar(
    usuario: Usuario
  ) {
    setError("");
    setMensaje("");
    setUsuarioVisualizando(usuario);
  }

  /* ============================================================
     ABRIR EDICIÓN
  ============================================================ */

  async function abrirEditar(
    usuario: Usuario
  ) {
    try {
      setError("");
      setMensaje("");

      setModoEdicion(true);
      setUsuarioEditando(usuario);

      /*
       * Abrimos el modal inmediatamente para dar respuesta
       * visual al usuario.
       */
      setModalAbierto(true);

      const headers =
        await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      const response =
        await fetch(
          `/api/usuarios/${encodeURIComponent(
            usuario.id
          )}`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible obtener el usuario."
        );
      }

      const detalle =
        data.usuario as Usuario;

      const asignaciones =
        Array.isArray(
          data.asignaciones
        )
          ? data.asignaciones
          : [];

      const asignacion =
        asignaciones.find(
          (a: any) =>
            a.activo === true &&
            a.perfil_predeterminado ===
              true
        ) ||
        asignaciones.find(
          (a: any) =>
            a.activo === true
        ) ||
        null;

      const departamentoId =
        asignacion?.cargo
          ?.departamento_id ||
        detalle.cargo
          ?.departamento_id ||
        "";

      setFormulario({
        email:
          detalle.email || "",

        password:
          "",

        tipo_persona_id:
          detalle.tipo_persona_id ||
          "",

        tipo_identificacion_id:
          detalle.tipo_identificacion_id ||
          "",

        numero_identificacion:
          detalle.numero_identificacion ||
          "",

        nombres:
          detalle.nombres || "",

        apellidos:
          detalle.apellidos || "",

        razon_social:
          detalle.razon_social || "",

        telefono:
          detalle.telefono || "",

        direccion:
          detalle.direccion || "",

        estado_usuario_id:
          detalle.estado_usuario_id ||
          "",

        fecha_ingreso:
          detalle.fecha_ingreso ||
          "",

        fecha_retiro:
          detalle.fecha_retiro ||
          "",

        departamento_id:
          departamentoId,

        cargo_id:
          asignacion?.cargo_id ||
          detalle.cargo_id ||
          "",

        rol_id:
          asignacion?.rol_id ||
          "",

        perfil_predeterminado:
          asignacion?.perfil_predeterminado !== false,

        clave_repositorio:
          detalle.clave_repositorio || "",

        puede_iniciar_flujos:
          detalle.puede_iniciar_flujos === true,
      });
    } catch (e: any) {
      console.error(
        "Error obteniendo usuario:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cargar el usuario."
      );
    }
  }

  /* ============================================================
     CERRAR MODAL
  ============================================================ */

  function cerrarModal() {
    if (guardando) {
      return;
    }

    setModalAbierto(false);

    setUsuarioEditando(null);

    setFormulario(
      formularioInicial
    );
  }

  /* ============================================================
     GUARDAR USUARIO
  ============================================================ */

  async function guardarUsuario(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setMensaje("");

    const departamentoId =
  formulario.departamento_id.trim();

const cargoId =
  formulario.cargo_id.trim();

if (!departamentoId) {
  setError(
    "Debe seleccionar un departamento."
  );
  return;
}

if (!cargoId) {
  setError(
    "Debe seleccionar un cargo."
  );
  return;
}

    /* ----------------------------------------------------------
       VALIDACIONES
    ---------------------------------------------------------- */

    if (
      !formulario.tipo_persona_id
    ) {
      setError(
        "Debe seleccionar el tipo de persona."
      );
      return;
    }

    if (
      !formulario.tipo_identificacion_id
    ) {
      setError(
        "Debe seleccionar el tipo de identificación."
      );
      return;
    }

    if (
      !formulario.numero_identificacion.trim()
    ) {
      setError(
        "El número de identificación es obligatorio."
      );
      return;
    }

    if (esPersonaJuridica) {
      if (
        !formulario.razon_social.trim()
      ) {
        setError(
          "La razón social es obligatoria."
        );
        return;
      }
    } else {
      if (
        !formulario.nombres.trim()
      ) {
        setError(
          "Los nombres son obligatorios."
        );
        return;
      }

      if (
        !formulario.apellidos.trim()
      ) {
        setError(
          "Los apellidos son obligatorios."
        );
        return;
      }
    }

    if (
      !formulario.email.trim()
    ) {
      setError(
        "El correo electrónico es obligatorio."
      );
      return;
    }

    if (!modoEdicion) {
      if (!formulario.password) {
        setError(
          "La contraseña es obligatoria para crear el usuario."
        );
        return;
      }

      if (
        formulario.password.length <
        6
      ) {
        setError(
          "La contraseña debe tener mínimo 6 caracteres."
        );
        return;
      }
    }

    /*
     * REGLA INSTITUCIONAL:
     *
     * Departamento y cargo son obligatorios.
     */
    if (
      !formulario.departamento_id
    ) {
      setError(
        "Debe seleccionar un departamento."
      );
      return;
    }

    if (!formulario.cargo_id) {
      setError(
        "Debe seleccionar un cargo."
      );
      return;
    }

    if (!formulario.rol_id) {
      setError(
        "Debe seleccionar un rol."
      );
      return;
    }

    if (
      !formulario.estado_usuario_id
    ) {
      setError(
        "Debe seleccionar el estado del usuario."
      );
      return;
    }

    /* ----------------------------------------------------------
       GUARDAR
    ---------------------------------------------------------- */

    try {
      setGuardando(true);

      
const payload: Record<string, any> = {
  email:
    formulario.email.trim(),

  tipo_persona_id:
    formulario.tipo_persona_id,

  tipo_identificacion_id:
    formulario.tipo_identificacion_id,

  numero_identificacion:
    formulario.numero_identificacion.trim(),

  nombres:
    esPersonaJuridica
      ? ""
      : formulario.nombres.trim(),

  apellidos:
    esPersonaJuridica
      ? ""
      : formulario.apellidos.trim(),

  razon_social:
    esPersonaJuridica
      ? formulario.razon_social.trim()
      : "",

  telefono:
    formulario.telefono.trim(),

  direccion:
    formulario.direccion.trim(),

  estado_usuario_id:
    formulario.estado_usuario_id,

  fecha_ingreso:
    formulario.fecha_ingreso || null,

  fecha_retiro:
    formulario.fecha_retiro || null,

  /*
   * Departamento obligatorio.
   */
  departamento_id:
    formulario.departamento_id.trim(),

  /*
   * CARGO OBLIGATORIO.
   *
   * IMPORTANTE:
   * Este campo faltaba en el payload anterior.
   */
  cargo_id:
    formulario.cargo_id.trim(),

  /*
   * Rol de la asignación predeterminada.
   */
  rol_id:
    formulario.rol_id,

  perfil_predeterminado:
    formulario.perfil_predeterminado,

  /*
   * Clave de acceso a la Bóveda Privada.
   *
   * Si se deja vacía durante una edición,
   * la API conserva la existente.
   */
  clave_repositorio:
    formulario.clave_repositorio.trim() || null,

  /*
   * Permiso para iniciar flujos.
   */
  puede_iniciar_flujos:
    formulario.puede_iniciar_flujos === true,
};

      /*
       * FOTO_URL NO SE ENVÍA.
       *
       * La fotografía será administrada por el propio
       * usuario desde el portal.
       */

      if (!modoEdicion) {
        payload.password =
          formulario.password;
      }

      const headers =
        await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      const url = modoEdicion
        ? `/api/usuarios/${encodeURIComponent(
            usuarioEditando?.id || ""
          )}`
        : "/api/usuarios";

      const method = modoEdicion
        ? "PUT"
        : "POST";

      const response =
        await fetch(url, {
          method,

          headers: {
            ...headers,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        });

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible guardar el usuario."
        );
      }

      setMensaje(
        data.message ||
          "Usuario guardado correctamente."
      );

      await cargarUsuarios();

      /*
       * Cerramos después de mostrar brevemente
       * el resultado positivo.
       */
      window.setTimeout(() => {
        setModalAbierto(false);
        setUsuarioEditando(null);
        setFormulario(
          formularioInicial
        );
      }, 500);
    } catch (e: any) {
      console.error(
        "Error guardando usuario:",
        e
      );

      setError(
        e?.message ||
          "No fue posible guardar el usuario."
      );
    } finally {
      setGuardando(false);
    }
  }

  /* ============================================================
     CAMBIAR ESTADO
  ============================================================ */

  async function cambiarEstado(
    usuario: Usuario,
    activo: boolean
  ) {
    try {
      setError("");
      setMensaje("");

      const headers =
        await authHeaders();

      if (!headers.Authorization) {
        throw new Error(
          "No hay una sesión autenticada."
        );
      }

      const response =
        await fetch(
          `/api/usuarios/${encodeURIComponent(
            usuario.id
          )}/estado`,
          {
            method: "PATCH",

            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              activo,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "No fue posible cambiar el estado."
        );
      }

      setMensaje(
        data.message ||
          "Estado actualizado correctamente."
      );

      setConfirmacion(null);

      await cargarUsuarios();
    } catch (e: any) {
      console.error(
        "Error cambiando estado:",
        e
      );

      setError(
        e?.message ||
          "No fue posible cambiar el estado."
      );

      setConfirmacion(null);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ======================================================
            ENCABEZADO
        ====================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white shadow-sm">
                👥
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Administración
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Usuarios
                </h1>

                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  Administra usuarios, perfiles,
                  cargos y roles del portal.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={abrirCrear}
              disabled={
                cargandoCatalogos
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-lg">
                +
              </span>

              Nuevo usuario
            </button>

          </div>
        </div>

        {/* ======================================================
            MENSAJES
        ====================================================== */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg">
                ⚠️
              </span>

              <div>
                <p className="font-semibold">
                  Se produjo un error
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {mensaje && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg">
                ✓
              </span>

              <span className="font-medium">
                {mensaje}
              </span>
            </div>
          </div>
        )}

        {/* ======================================================
            FILTROS
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row md:items-center">

            <div className="relative flex-1">

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="Buscar por nombre, identificación, correo o teléfono..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />

            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">

              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) =>
                  setSoloActivos(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded"
              />

              Solo activos

            </label>

          </div>
        </div>

        {/* ======================================================
            TABLA
        ====================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Usuario
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identificación
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Departamento
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cargo
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rol
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {cargando ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-xs flex-col items-center">

                        <div className="mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-slate-100">
                          👤
                        </div>

                        <p className="text-sm font-medium text-slate-600">
                          Cargando usuarios...
                        </p>

                      </div>
                    </td>
                  </tr>

                ) : usuarios.length === 0 ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >

                      <div className="mx-auto flex max-w-sm flex-col items-center">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                          👤
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          No hay usuarios para mostrar.
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Intenta cambiar los
                          filtros o crea un
                          nuevo usuario.
                        </p>

                      </div>

                    </td>
                  </tr>

                ) : (

                  usuarios.map(
                    (usuario) => {
                      const activo =
                        usuarioEstaActivo(
                          usuario
                        );

                      const asignacion =
  usuario.asignacion_predeterminada;

/*
 * DEPARTAMENTO
 *
 * Nunca debe utilizarse asignacion.cargo.nombre
 * porque ese valor corresponde al CARGO.
 *
 * Primero intentamos obtener el departamento
 * directamente desde usuario.cargo.departamento.
 *
 * Como respaldo utilizamos el departamento_id del
 * cargo y buscamos el nombre en los catálogos.
 */
const departamentoId =
  asignacion?.cargo?.departamento_id ||
  usuario.cargo?.departamento_id ||
  "";

const departamento =
  usuario.cargo?.departamento?.nombre ||
  catalogos.departamentos.find(
    (item) => item.id === departamentoId
  )?.nombre ||
  "—";

/*
 * CARGO
 */
const cargo =
  asignacion?.cargo?.nombre ||
  usuario.cargo?.nombre ||
  "—";

/*
 * ROL
 */
const rol =
  asignacion?.rol?.nombre ||
  "Sin rol";

                      return (

                        <tr
                          key={
                            usuario.id
                          }
                          className="transition hover:bg-slate-50"
                        >

                          {/* USUARIO */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              {usuario.foto_url ? (

                                <img
                                  src={
                                    usuario.foto_url
                                  }
                                  alt={nombreUsuario(
                                    usuario
                                  )}
                                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                                />

                              ) : (

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                  {inicialesUsuario(
                                    usuario
                                  )}
                                </div>

                              )}

                              <div className="min-w-0">

                                <p className="truncate font-semibold text-slate-800">
                                  {nombreUsuario(
                                    usuario
                                  )}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {usuario.email}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* IDENTIFICACIÓN */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-medium text-slate-700">
                              {
                                usuario.numero_identificacion
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {
                                usuario
                                  .tipo_identificacion
                                  ?.nombre ||
                                "—"
                              }
                            </p>

                          </td>

                          {/* DEPARTAMENTO */}

                          <td className="px-5 py-4">

                            <p className="text-sm text-slate-600">
                              {departamento}
                            </p>

                          </td>

                          {/* CARGO */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-medium text-slate-700">
                              {cargo}
                            </p>

                          </td>

                          {/* ROL */}

                          <td className="px-5 py-4">

                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {rol}
                            </span>

                          </td>

                          {/* ESTADO */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                activo
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  activo
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />

                              {
                                usuario
                                  .estado_usuario
                                  ?.nombre ||
                                "Sin estado"
                              }

                            </span>

                          </td>

                          {/* ==========================================================
    ACCIONES
========================================================== */}

<td className="px-4 py-3">
  <div className="flex items-center justify-end gap-1">

    {/* VISUALIZAR */}
    <button
      type="button"
      onClick={() =>
        abrirVisualizar(usuario)
      }
      title="Visualizar usuario"
      aria-label="Visualizar usuario"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
        />
        <circle
          cx="12"
          cy="12"
          r="2.75"
        />
      </svg>
    </button>

    {/* EDITAR */}
    <button
      type="button"
      onClick={() =>
        abrirEditar(usuario)
      }
      title="Editar usuario"
      aria-label="Editar usuario"
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 3.487 3.651 3.651M4 20h4.651L19.94 8.711a2.587 2.587 0 0 0 0-3.66l-.991-.991a2.587 2.587 0 0 0-3.66 0L4 15.349V20Z"
        />
      </svg>

      Editar
    </button>

    {/* ACTIVAR / DESACTIVAR */}
    <button
      type="button"
      onClick={() =>
        setConfirmacion({
          usuario,
          activo: !activo,
        })
      }
      title={
        activo
          ? "Desactivar usuario"
          : "Activar usuario"
      }
      className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition ${
        activo
          ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
          : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {activo
        ? "Desactivar"
        : "Activar"}
    </button>

  </div>
</td>

                        </tr>

                      );
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ========================================================
          MODAL CREAR / EDITAR
      ======================================================== */}

      {modalAbierto && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg text-white">
                  {modoEdicion
                    ? "✎"
                    : "+"}
                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Administración de usuarios
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {modoEdicion
                      ? "Editar usuario"
                      : "Nuevo usuario"}
                  </h2>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  cerrarModal
                }
                disabled={
                  guardando
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                ×
              </button>

            </div>

            {/* FORMULARIO */}

            <form
              onSubmit={
                guardarUsuario
              }
              className="overflow-y-auto"
            >

              <div className="space-y-8 p-6">

                {/* ==================================================
                    ACCESO
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      🔐
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Acceso al portal
                      </h3>

                      <p className="text-sm text-slate-500">
                        Datos utilizados para ingresar
                        al sistema.
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Correo electrónico *
                      </label>

                      <input
                        type="email"
                        value={
                          formulario.email
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "email",
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        placeholder="usuario@dominio.com"
                      />

                    </div>

                    {!modoEdicion && (

                      <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Contraseña *
                        </label>

                        <input
                          type="password"
                          value={
                            formulario.password
                          }
                          onChange={(e) =>
                            actualizarCampo(
                              "password",
                              e.target.value
                            )
                          }
                          required
                          minLength={6}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Mínimo 6 caracteres"
                        />

                        <p className="mt-1 text-xs text-slate-400">
                          Esta contraseña será utilizada
                          para el primer ingreso.
                        </p>

                      </div>

                    )}

                  </div>

                </section>

                {/* ==================================================
                    IDENTIDAD
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      👤
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Identificación
                      </h3>

                      <p className="text-sm text-slate-500">
                        Información básica del usuario.
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                    {/* TIPO PERSONA */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Tipo de persona *
                      </label>

                      <select
                        value={
                          formulario.tipo_persona_id
                        }
                        onChange={(e) =>
                          cambiarTipoPersona(
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >

                        <option value="">
                          Seleccionar...
                        </option>

                        {catalogos.tiposPersona.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    {/* TIPO IDENTIFICACIÓN */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Tipo identificación *
                      </label>

                      <select
                        value={
                          formulario.tipo_identificacion_id
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "tipo_identificacion_id",
                            e.target.value
                          )
                        }
                        disabled={
                          !formulario.tipo_persona_id
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                      >

                        <option value="">
                          Seleccionar...
                        </option>

                        {tiposIdentificacionFiltrados.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.codigo
                                ? `${item.codigo} - `
                                : ""}
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    {/* NÚMERO */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Número identificación *
                      </label>

                      <input
                        type="text"
                        value={
                          formulario.numero_identificacion
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "numero_identificacion",
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />

                    </div>

                  </div>

                  <div className="mt-5">

                    {esPersonaJuridica ? (

                      <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Razón social *
                        </label>

                        <input
                          type="text"
                          value={
                            formulario.razon_social
                          }
                          onChange={(e) =>
                            actualizarCampo(
                              "razon_social",
                              e.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Nombre legal de la organización"
                        />

                      </div>

                    ) : (

                      <div className="grid gap-5 md:grid-cols-2">

                        <div>

                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Nombres *
                          </label>

                          <input
                            type="text"
                            value={
                              formulario.nombres
                            }
                            onChange={(e) =>
                              actualizarCampo(
                                "nombres",
                                e.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />

                        </div>

                        <div>

                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Apellidos *
                          </label>

                          <input
                            type="text"
                            value={
                              formulario.apellidos
                            }
                            onChange={(e) =>
                              actualizarCampo(
                                "apellidos",
                                e.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />

                        </div>

                      </div>

                    )}

                  </div>

                </section>

                {/* ==================================================
                    CONTACTO
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      ☎
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Información de contacto
                      </h3>

                      <p className="text-sm text-slate-500">
                        Datos adicionales de contacto.
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Teléfono
                      </label>

                      <input
                        type="text"
                        value={
                          formulario.telefono
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "telefono",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Número de contacto"
                      />

                    </div>

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Dirección
                      </label>

                      <input
                        type="text"
                        value={
                          formulario.direccion
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "direccion",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Dirección"
                      />

                    </div>

                  </div>

                </section>

                {/* ==================================================
                    ORGANIZACIÓN
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      🏢
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Organización y perfil
                      </h3>

                      <p className="text-sm text-slate-500">
                        El departamento y cargo son
                        obligatorios para todo usuario.
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                    {/* DEPARTAMENTO */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Departamento *
                      </label>

                      <select
                        value={
                          formulario.departamento_id
                        }
                        onChange={(e) =>
                          cambiarDepartamento(
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >

                        <option value="">
                          Seleccionar departamento...
                        </option>

                        {catalogos.departamentos.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.codigo
                                ? `${item.codigo} - `
                                : ""}
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    {/* CARGO */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Cargo *
                      </label>

                      <select
                        value={
                          formulario.cargo_id
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "cargo_id",
                            e.target.value
                          )
                        }
                        disabled={
                          !formulario.departamento_id
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                      >

                        <option value="">
                          {!formulario.departamento_id
                            ? "Seleccione primero un departamento..."
                            : "Seleccionar cargo..."}
                        </option>

                        {cargosFiltrados.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.codigo
                                ? `${item.codigo} - `
                                : ""}
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                      {!formulario.departamento_id && (
                        <p className="mt-1 text-xs text-slate-400">
                          Seleccione primero el departamento.
                        </p>
                      )}

                    </div>

                    {/* ROL */}

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Rol *
                      </label>

                      <select
                        value={
                          formulario.rol_id
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "rol_id",
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >

                        <option value="">
                          Seleccionar rol...
                        </option>

                        {catalogos.roles.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  </div>

                  {/* PERFIL */}

                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 transition hover:bg-indigo-50">

                    <input
                      type="checkbox"
                      checked={
                        formulario.perfil_predeterminado
                      }
                      onChange={(e) =>
                        actualizarCampo(
                          "perfil_predeterminado",
                          e.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 rounded"
                    />

                    <div>

                      <p className="text-sm font-semibold text-slate-800">
                        Perfil predeterminado
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Este cargo y rol serán utilizados
                        como perfil principal del usuario.
                      </p>

                    </div>

                  </label>

                </section>

                {/* ==================================================
    SEGURIDAD Y PERMISOS
================================================== */}

<section>
  <div className="mb-4 flex items-start gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
      🔑
    </div>

    <div>
      <h3 className="font-semibold text-slate-900">
        Seguridad y permisos
      </h3>

      <p className="text-sm text-slate-500">
        Configuración adicional de acceso y
        capacidades del usuario.
      </p>
    </div>
  </div>

  <div className="grid gap-5 md:grid-cols-2">
    {/* CLAVE REPOSITORIO */}

    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        Clave del repositorio
      </label>

      <input
        type="password"
        value={
          formulario.clave_repositorio
        }
        onChange={(e) =>
          actualizarCampo(
            "clave_repositorio",
            e.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        placeholder="Clave para acceso al repositorio privado"
        autoComplete="new-password"
      />

      <p className="mt-1 text-xs leading-5 text-slate-400">
        Esta clave es administrada desde el
        registro del usuario y se utiliza para
        controlar su acceso al repositorio privado.
      </p>
    </div>

    {/* PUEDE INICIAR FLUJOS */}

    <div>
      <label className="flex h-full cursor-pointer items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 transition hover:bg-violet-50">
        <input
          type="checkbox"
          checked={
            formulario.puede_iniciar_flujos
          }
          onChange={(e) =>
            actualizarCampo(
              "puede_iniciar_flujos",
              e.target.checked
            )
          }
          className="mt-1 h-4 w-4 rounded"
        />

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Puede iniciar flujos
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Permite al usuario iniciar procesos
            dentro del módulo de flujos de
            aprobación.
          </p>
        </div>
      </label>
    </div>
  </div>
</section>

                {/* ==================================================
                    ESTADO
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      ✓
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Estado y fechas
                      </h3>

                      <p className="text-sm text-slate-500">
                        Estado administrativo y fechas del usuario.
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-3">

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Estado *
                      </label>

                      <select
                        value={
                          formulario.estado_usuario_id
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "estado_usuario_id",
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >

                        <option value="">
                          Seleccionar estado...
                        </option>

                        {catalogos.estadosUsuario.map(
                          (item) => (

                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {item.nombre}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Fecha de ingreso
                      </label>

                      <input
                        type="date"
                        value={
                          formulario.fecha_ingreso
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "fecha_ingreso",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />

                    </div>

                    <div>

                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Fecha de retiro
                      </label>

                      <input
                        type="date"
                        value={
                          formulario.fecha_retiro
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "fecha_retiro",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />

                    </div>

                  </div>

                </section>

                {/* ==================================================
                    FOTO
                ================================================== */}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

                  <div className="flex gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      📷
                    </div>

                    <div>

                      <p className="text-sm font-semibold text-blue-900">
                        Foto de perfil
                      </p>

                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        La fotografía no se administra desde
                        este formulario. El usuario podrá
                        actualizar su imagen posteriormente
                        desde su perfil dentro del portal.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  disabled={
                    guardando
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    cargandoCatalogos
                  }
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {guardando
                    ? "Guardando..."
                    : modoEdicion
                    ? "Guardar cambios"
                    : "Crear usuario"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ========================================================
    MODAL VISUALIZAR USUARIO
======================================================== */}

{usuarioVisualizando && (
  <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">

      {/* HEADER */}

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

        <div className="flex items-center gap-4">

          {usuarioVisualizando.foto_url ? (
            <img
              src={
                usuarioVisualizando.foto_url
              }
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {inicialesUsuario(
                usuarioVisualizando
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Información del usuario
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {nombreUsuario(
                usuarioVisualizando
              )}
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              {usuarioVisualizando.email}
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() =>
            setUsuarioVisualizando(null)
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ×
        </button>

      </div>

      {/* CONTENIDO */}

      <div className="overflow-y-auto p-6">

        <div className="grid gap-5 md:grid-cols-2">

          {/* IDENTIDAD */}

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Identificación
            </h3>

            <div className="space-y-3 text-sm">

              <div>
                <p className="text-xs text-slate-400">
                  Tipo de persona
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .tipo_persona
                    ?.nombre || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Tipo de identificación
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .tipo_identificacion
                    ?.nombre || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Número de identificación
                </p>

                <p className="font-medium text-slate-700">
                  {
                    usuarioVisualizando
                      .numero_identificacion
                  }
                </p>
              </div>

            </div>

          </section>

          {/* ORGANIZACIÓN / MULTICARGOS */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cargos y asignaciones
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Cargos asociados actualmente a este usuario.
                </p>
              </div>
              {usuarioVisualizando.asignaciones && usuarioVisualizando.asignaciones.length > 0 && (
                <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {usuarioVisualizando.asignaciones.filter((a) => a.activo !== false).length} activo
                  {usuarioVisualizando.asignaciones.filter((a) => a.activo !== false).length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {(() => {
              const asignacionesUsuario = Array.isArray(usuarioVisualizando.asignaciones)
                ? usuarioVisualizando.asignaciones
                : [];

              // Agrupar por cargo para que un mismo cargo no se repita si tiene más de un rol.
              const cargosAgrupados = new Map<string, {
                cargo: any;
                activo: boolean;
                predeterminado: boolean;
                roles: string[];
              }>();

              for (const asignacion of asignacionesUsuario) {
                const cargoId = asignacion.cargo_id || asignacion.cargo?.id || asignacion.id;
                const cargo = asignacion.cargo;
                const existente = cargosAgrupados.get(cargoId);

                if (!existente) {
                  cargosAgrupados.set(cargoId, {
                    cargo,
                    activo: asignacion.activo !== false && cargo?.activo !== false,
                    predeterminado: asignacion.perfil_predeterminado === true,
                    roles: asignacion.rol?.nombre ? [asignacion.rol.nombre] : [],
                  });
                } else {
                  existente.activo = existente.activo || (asignacion.activo !== false && cargo?.activo !== false);
                  existente.predeterminado = existente.predeterminado || asignacion.perfil_predeterminado === true;
                  if (asignacion.rol?.nombre && !existente.roles.includes(asignacion.rol.nombre)) {
                    existente.roles.push(asignacion.rol.nombre);
                  }
                }
              }

              const cargos = Array.from(cargosAgrupados.values());

              if (!cargos.length) {
                return (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      No hay cargos asociados a este usuario.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid gap-3 md:grid-cols-2">
                  {cargos.map((item, index) => {
                    const departamento = item.cargo?.departamento;
                    const area = departamento?.area;

                    return (
                      <div
                        key={`${item.cargo?.id || "cargo"}-${index}`}
                        className={`rounded-xl border bg-white p-4 ${
                          item.activo
                            ? "border-slate-200"
                            : "border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Cargo {index + 1}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {item.cargo?.nombre || "Cargo sin nombre"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              item.activo
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                          <div>
                            <p className="text-slate-400">Departamento</p>
                            <p className="font-medium text-slate-700">
                              {departamento?.nombre || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Área</p>
                            <p className="font-medium text-slate-700">
                              {area?.nombre || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Rol{item.roles.length === 1 ? "" : "es"}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {item.roles.length ? (
                                item.roles.map((rol) => (
                                  <span
                                    key={rol}
                                    className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                                  >
                                    {rol}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">Sin rol</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.predeterminado && (
                          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
                            Perfil predeterminado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* CONTACTO */}

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Contacto
            </h3>

            <div className="space-y-3 text-sm">

              <div>
                <p className="text-xs text-slate-400">
                  Correo electrónico
                </p>

                <p className="font-medium text-slate-700 break-all">
                  {usuarioVisualizando.email ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Teléfono
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .telefono || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Dirección
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .direccion || "—"}
                </p>
              </div>

            </div>

          </section>

          {/* ESTADO */}

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Estado y fechas
            </h3>

            <div className="space-y-3 text-sm">

              <div>
                <p className="text-xs text-slate-400">
                  Estado
                </p>

                <span
                  className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    usuarioEstaActivo(
                      usuarioVisualizando
                    )
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      usuarioEstaActivo(
                        usuarioVisualizando
                      )
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />

                  {usuarioVisualizando
                    .estado_usuario
                    ?.nombre ||
                    "Sin estado"}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Fecha de ingreso
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .fecha_ingreso || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Fecha de retiro
                </p>

                <p className="font-medium text-slate-700">
                  {usuarioVisualizando
                    .fecha_retiro || "—"}
                </p>
              </div>

            </div>

          </section>

          {/* SEGURIDAD */}

          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 md:col-span-2">

            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Seguridad y permisos
            </h3>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <p className="text-xs text-slate-400">
                  Clave del repositorio
                </p>

                <p className="mt-1 font-medium text-slate-700">
                  {usuarioVisualizando
                    .clave_repositorio
                    ? "Configurada"
                    : "No configurada"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Puede iniciar flujos
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    usuarioVisualizando
                      .puede_iniciar_flujos
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {usuarioVisualizando
                    .puede_iniciar_flujos
                    ? "Sí"
                    : "No"}
                </span>
              </div>

            </div>

          </section>

        </div>

      </div>

      {/* FOOTER */}

      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">

        <button
          type="button"
          onClick={() =>
            setUsuarioVisualizando(null)
          }
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cerrar
        </button>

        <button
          type="button"
          onClick={() => {
            const usuario =
              usuarioVisualizando;

            setUsuarioVisualizando(null);

            abrirEditar(usuario);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Editar usuario
        </button>

      </div>

    </div>

  </div>
)}

      {/* ========================================================
          CONFIRMACIÓN ESTADO
      ======================================================== */}

      {confirmacion && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="p-6">

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${
                  confirmacion.activo
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {confirmacion.activo
                  ? "✓"
                  : "!"}
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">

                {confirmacion.activo
                  ? "Activar usuario"
                  : "Desactivar usuario"}

              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">

                ¿Deseas{" "}

                {confirmacion.activo
                  ? "activar"
                  : "desactivar"}

                {" "}

                a{" "}

                <strong className="text-slate-700">
                  {nombreUsuario(
                    confirmacion.usuario
                  )}
                </strong>
                ?

              </p>

              {!confirmacion.activo && (

                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">

                  <p className="text-xs leading-5 text-amber-700">

                    Al desactivar el usuario también
                    se desactivarán sus asignaciones
                    actuales.

                  </p>

                </div>

              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">

              <button
                type="button"
                onClick={() =>
                  setConfirmacion(
                    null
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  cambiarEstado(
                    confirmacion.usuario,
                    confirmacion.activo
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                  confirmacion.activo
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmacion.activo
                  ? "Activar"
                  : "Desactivar"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}