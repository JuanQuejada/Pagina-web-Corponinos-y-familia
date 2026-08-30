"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Briefcase,
  Plus,
  Pencil,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  FolderTree,
  FileSignature,
  ListOrdered,
  Layers,
  AlertTriangle,
  GitBranch,
  ShieldCheck,
  CheckCircle,
  Workflow,
  Users,
} from "lucide-react";

interface Departamento {
  id: string;
  codigo?: string | null;
  nombre: string;
  activo?: boolean;
}

interface CargoSuperior {
  id: string;
  codigo?: string | null;
  nombre: string;
  nivel_organizacional?: number | null;
  nivel_jerarquico?: string | null;
  activo?: boolean;
}

interface UsuarioAsignado {
  id: string;
  nombres?: string | null;
  apellidos?: string | null;
  razon_social?: string | null;
  email?: string | null;
  numero_identificacion?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  activo?: boolean | null;
}

interface Cargo {
  id: string;
  departamento_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  nivel_organizacional: number;
  reporta_a?: string | null;
  requiere_firma: boolean;
  puede_aprobar: boolean;
  puede_iniciar_flujos: boolean;
  orden: number;
  activo: boolean;
  editable: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  es_firma_autorizada?: boolean | null;
  nivel_jerarquico?: string | null;
  departamento?: {
    id: string;
    codigo?: string | null;
    nombre: string;
    activo?: boolean;
  } | null;
  cargo_superior?: CargoSuperior | null;
}

interface FormCargo {
  departamento_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  nivel_organizacional: number;
  nivel_jerarquico: string;
  reporta_a: string;
  requiere_firma: boolean;
  puede_aprobar: boolean;
  puede_iniciar_flujos: boolean;
  es_firma_autorizada: boolean;
  orden: number;
  activo: boolean;
}

type TipoMensaje = "exito" | "error";

const NIVELES_JERARQUICOS = [
  "Directivo",
  "Estratégico",
  "Táctico / Coordinación",
  "Operativo",
  "Asistencial",
];

const FORM_INICIAL: FormCargo = {
  departamento_id: "",
  codigo: "",
  nombre: "",
  descripcion: "",
  nivel_organizacional: 1,
  nivel_jerarquico: "Operativo",
  reporta_a: "",
  requiere_firma: false,
  puede_aprobar: false,
  puede_iniciar_flujos: false,
  es_firma_autorizada: false,
  orden: 1,
  activo: true,
};

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<
    Departamento[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<
    string | null
  >(null);

  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] =
    useState(false);

  const [cargoEditando, setCargoEditando] =
    useState<Cargo | null>(null);

  const [cargoAEliminar, setCargoAEliminar] =
    useState<Cargo | null>(null);

  const [modoLectura, setModoLectura] = useState(false);

  const [usuariosAsignados, setUsuariosAsignados] =
    useState<UsuarioAsignado[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] =
    useState(false);
  const [errorUsuarios, setErrorUsuarios] =
    useState<string | null>(null);

  const [formCargo, setFormCargo] =
    useState<FormCargo>(FORM_INICIAL);

  const [mensaje, setMensaje] = useState<{
    tipo: TipoMensaje;
    texto: string;
  } | null>(null);

  // ==========================================================
  // MENSAJES
  // ==========================================================

  const mostrarMensaje = (
    tipo: TipoMensaje,
    texto: string
  ) => {
    setMensaje({ tipo, texto });

    window.setTimeout(() => {
      setMensaje(null);
    }, 4500);
  };

  // ==========================================================
  // FETCH JSON
  // ==========================================================

  const obtenerJson = async (
  url: string,
  opciones?: RequestInit
) => {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log("🔐 SESIÓN CARGOS:", {
    tieneSesion: !!sessionData.session,
    tieneToken: !!sessionData.session?.access_token,
    usuarioId: sessionData.session?.user?.id,
    sessionError,
  });

  const token =
    sessionData.session?.access_token;

  if (!token) {
    throw new Error(
      "No hay una sesión autenticada."
    );
  }

  const response = await fetch(
    url,
    {
      ...opciones,
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(opciones?.headers || {}),
      },
      cache: "no-store",
    }
  );

  const data =
    await response
      .json()
      .catch(() => null);

  console.log("📡 RESPUESTA API CARGOS:", {
    url,
    status: response.status,
    ok: response.ok,
    data,
  });

  if (
    !response.ok ||
    data?.ok === false
  ) {
    throw new Error(
      data?.error ||
        data?.detalle ||
        `Error del servidor (${response.status}).`
    );
  }

  return data;
};

  // ==========================================================
  // CARGAR DEPARTAMENTOS
  // ==========================================================

  const cargarDepartamentos = async () => {
    const data = await obtenerJson(
      "/api/organizacion/departamentos?solo_activos=true"
    );

    setDepartamentos(data.data ?? []);
  };

  // ==========================================================
  // CARGAR CARGOS
  // ==========================================================

  const cargarCargos = async () => {
    const data = await obtenerJson(
      "/api/organizacion/cargos"
    );

    setCargos(data.data ?? []);
  };

  const cargarDatos = async () => {
    setCargando(true);

    try {
      await Promise.all([
        cargarDepartamentos(),
        cargarCargos(),
      ]);
    } catch (error: any) {
      console.error("Error cargando cargos:", error);

      mostrarMensaje(
        "error",
        error?.message ||
          "No fue posible cargar la información."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================================
  // CARGAR USUARIOS ASIGNADOS AL CARGO
  // ==========================================================

  const cargarUsuariosAsignados = async (cargoId: string) => {
    if (!cargoId) return;

    setCargandoUsuarios(true);
    setUsuariosAsignados([]);
    setErrorUsuarios(null);

    try {
      const data = await obtenerJson(
        `/api/organizacion/cargos/${cargoId}/usuarios`
      );

      setUsuariosAsignados(data.data ?? []);
    } catch (error: any) {
      console.error(
        "Error cargando usuarios asignados al cargo:",
        error
      );

      setErrorUsuarios(
        error?.message ||
          "No fue posible cargar los usuarios asignados."
      );
    } finally {
      setCargandoUsuarios(false);
    }
  };

  // ==========================================================
  // ABRIR MODAL
  // ==========================================================

  const abrirModal = (
    cargo?: Cargo,
    esLectura = false
  ) => {
    setModoLectura(esLectura);

    if (cargo) {
      setCargoEditando(cargo);

      setFormCargo({
        departamento_id:
          cargo.departamento_id || "",
        codigo: cargo.codigo || "",
        nombre: cargo.nombre || "",
        descripcion: cargo.descripcion || "",
        nivel_organizacional:
          cargo.nivel_organizacional || 1,
        nivel_jerarquico:
          cargo.nivel_jerarquico || "Operativo",
        reporta_a: cargo.reporta_a || "",
        requiere_firma:
          cargo.requiere_firma ?? false,
        puede_aprobar:
          cargo.puede_aprobar ?? false,
        puede_iniciar_flujos:
          cargo.puede_iniciar_flujos ?? false,
        es_firma_autorizada:
          cargo.es_firma_autorizada ?? false,
        orden: cargo.orden || 1,
        activo: cargo.activo ?? true,
      });

      if (esLectura) {
        void cargarUsuariosAsignados(cargo.id);
      } else {
        setUsuariosAsignados([]);
        setErrorUsuarios(null);
      }
    } else {
      setCargoEditando(null);
      setUsuariosAsignados([]);
      setErrorUsuarios(null);

      setFormCargo({
        ...FORM_INICIAL,
        departamento_id:
          departamentos.length > 0
            ? departamentos[0].id
            : "",
        orden: cargos.length + 1,
      });
    }

    setModalOpen(true);
  };

  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  const cerrarModal = () => {
    if (guardando) return;

    setModalOpen(false);
    setCargoEditando(null);
    setModoLectura(false);
    setUsuariosAsignados([]);
    setCargandoUsuarios(false);
    setErrorUsuarios(null);
    setFormCargo(FORM_INICIAL);
  };

  // ==========================================================
  // GUARDAR
  // ==========================================================

  const guardarCargo = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (modoLectura || guardando) return;

    const departamentoId =
      formCargo.departamento_id.trim();

    const codigo = formCargo.codigo.trim();
    const nombre = formCargo.nombre.trim();

    if (!departamentoId) {
      mostrarMensaje(
        "error",
        "Debes seleccionar un departamento."
      );
      return;
    }

    if (!codigo) {
      mostrarMensaje(
        "error",
        "El código del cargo es obligatorio."
      );
      return;
    }

    if (codigo.length > 10) {
      mostrarMensaje(
        "error",
        "El código no puede superar los 10 caracteres."
      );
      return;
    }

    if (!nombre) {
      mostrarMensaje(
        "error",
        "El nombre del cargo es obligatorio."
      );
      return;
    }

    if (
      !Number.isInteger(
        Number(formCargo.nivel_organizacional)
      ) ||
      Number(formCargo.nivel_organizacional) < 1
    ) {
      mostrarMensaje(
        "error",
        "El nivel organizacional debe ser un número entero mayor o igual a 1."
      );
      return;
    }

    if (
      formCargo.reporta_a &&
      cargoEditando?.id === formCargo.reporta_a
    ) {
      mostrarMensaje(
        "error",
        "Un cargo no puede reportarse a sí mismo."
      );
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        departamento_id: departamentoId,
        codigo: codigo.toUpperCase(),
        nombre,
        descripcion:
          formCargo.descripcion.trim() || null,
        nivel_organizacional:
          Number(formCargo.nivel_organizacional),
        nivel_jerarquico:
          formCargo.nivel_jerarquico,
        reporta_a:
          formCargo.reporta_a || null,
        requiere_firma:
          formCargo.requiere_firma,
        puede_aprobar:
          formCargo.puede_aprobar,
        puede_iniciar_flujos:
          formCargo.puede_iniciar_flujos,
        es_firma_autorizada:
          formCargo.es_firma_autorizada,
        orden:
          Number(formCargo.orden) || 1,
        activo:
          formCargo.activo,
      };

      if (cargoEditando) {
        await obtenerJson(
          `/api/organizacion/cargos/${cargoEditando.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        mostrarMensaje(
          "exito",
          "Cargo actualizado correctamente."
        );
      } else {
        await obtenerJson(
          "/api/organizacion/cargos",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        mostrarMensaje(
          "exito",
          "Cargo creado correctamente."
        );
      }

      cerrarModal();
      await cargarCargos();
    } catch (error: any) {
      console.error("Error guardando cargo:", error);

      mostrarMensaje(
        "error",
        error?.message ||
          "No fue posible guardar el cargo."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================================
  // ELIMINACIÓN
  // ==========================================================

  const confirmarEliminacion = (
    cargo: Cargo
  ) => {
    if (!cargo.editable) {
      mostrarMensaje(
        "error",
        "Este cargo no puede ser eliminado."
      );
      return;
    }

    setCargoAEliminar(cargo);
    setModalEliminarOpen(true);
  };

  const ejecutarEliminacion = async () => {
    if (!cargoAEliminar || guardando) return;

    setGuardando(true);

    try {
      await obtenerJson(
        `/api/organizacion/cargos/${cargoAEliminar.id}`,
        {
          method: "DELETE",
        }
      );

      mostrarMensaje(
        "exito",
        `El cargo "${cargoAEliminar.nombre}" fue eliminado correctamente.`
      );

      setModalEliminarOpen(false);
      setCargoAEliminar(null);

      await cargarCargos();
    } catch (error: any) {
      console.error(
        "Error eliminando cargo:",
        error
      );

      mostrarMensaje(
        "error",
        error?.message ||
          "No fue posible eliminar el cargo."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================================
  // CAMBIAR ESTADO
  // ==========================================================

  const alternarEstadoCargo = async (
    cargo: Cargo
  ) => {
    if (!cargo.editable) {
      mostrarMensaje(
        "error",
        "Este cargo no puede cambiar de estado."
      );
      return;
    }

    if (cambiandoEstado) return;

    setCambiandoEstado(cargo.id);

    try {
      await obtenerJson(
        `/api/organizacion/cargos/${cargo.id}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({
            activo: !cargo.activo,
          }),
        }
      );

      mostrarMensaje(
        "exito",
        cargo.activo
          ? "Cargo desactivado correctamente."
          : "Cargo activado correctamente."
      );

      await cargarCargos();
    } catch (error: any) {
      console.error(
        "Error cambiando estado:",
        error
      );

      mostrarMensaje(
        "error",
        error?.message ||
          "No fue posible cambiar el estado del cargo."
      );
    } finally {
      setCambiandoEstado(null);
    }
  };

  // ==========================================================
  // FILTRO
  // ==========================================================

  const cargosFiltrados = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLowerCase();

    if (!termino) return cargos;

    return cargos.filter((cargo) => {
      return (
        cargo.nombre
          .toLowerCase()
          .includes(termino) ||
        cargo.codigo
          .toLowerCase()
          .includes(termino) ||
        String(
          cargo.nivel_organizacional
        ).includes(termino) ||
        (
          cargo.nivel_jerarquico || ""
        )
          .toLowerCase()
          .includes(termino) ||
        (
          cargo.departamento?.nombre || ""
        )
          .toLowerCase()
          .includes(termino) ||
        (
          cargo.cargo_superior?.nombre || ""
        )
          .toLowerCase()
          .includes(termino)
      );
    });
  }, [cargos, busqueda]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-blue-600" />
            Cargos Organizacionales
          </h1>

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Definición de cargos, niveles jerárquicos,
            atribuciones y estructura organizacional
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            abrirModal(undefined, false)
          }
          disabled={departamentos.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cargo
        </button>
      </div>

      {/* =====================================================
          MENSAJE
      ====================================================== */}

      {mensaje && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
            mensaje.tipo === "exito"
              ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}

          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* =====================================================
          BUSCADOR
      ====================================================== */}

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por cargo, código, nivel, departamento o superior..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* =====================================================
          TABLA
      ====================================================== */}

      {cargando ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">
                    Código
                  </th>

                  <th className="py-3.5 px-4">
                    Cargo
                  </th>

                  <th className="py-3.5 px-4">
                    Departamento
                  </th>

                  <th className="py-3.5 px-4 text-center">
                    Nivel
                  </th>

                  <th className="py-3.5 px-4">
                    Jerarquía
                  </th>

                  <th className="py-3.5 px-4">
                    Reporta a
                  </th>

                  <th className="py-3.5 px-4 text-center">
                    Atribuciones
                  </th>

                  <th className="py-3.5 px-4 text-center">
                    Estado
                  </th>

                  <th className="py-3.5 px-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {cargosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-gray-400 text-sm"
                    >
                      No se encontraron cargos registrados.
                    </td>
                  </tr>
                ) : (
                  cargosFiltrados.map(
                    (cargo) => (
                      <tr
                        key={cargo.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-xs text-gray-600 dark:text-slate-400">
                            {cargo.codigo}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {cargo.nombre}
                          </p>

                          {cargo.descripcion && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                              {cargo.descripcion}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {cargo.departamento?.nombre ||
                              "-"}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold">
                            {cargo.nivel_organizacional}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">
                            {cargo.nivel_jerarquico ||
                              "Operativo"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {cargo.cargo_superior ? (
                            <div className="flex items-center gap-1.5">
                              <GitBranch className="h-3.5 w-3.5 text-gray-400" />

                              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                                {cargo.cargo_superior.nombre}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Nivel superior
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {cargo.requiere_firma && (
                              <span
                                title="Requiere firma"
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                              >
                                <FileSignature className="h-3.5 w-3.5" />
                              </span>
                            )}

                            {cargo.puede_aprobar && (
                              <span
                                title="Puede aprobar"
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </span>
                            )}

                            {cargo.puede_iniciar_flujos && (
                              <span
                                title="Puede iniciar flujos"
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                              >
                                <Workflow className="h-3.5 w-3.5" />
                              </span>
                            )}

                            {cargo.es_firma_autorizada && (
                              <span
                                title="Firma autorizada"
                                className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </span>
                            )}

                            {!cargo.requiere_firma &&
                              !cargo.puede_aprobar &&
                              !cargo.puede_iniciar_flujos &&
                              !cargo.es_firma_autorizada && (
                                <span className="text-xs text-gray-400">
                                  Ninguna
                                </span>
                              )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              cargo.activo
                                ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {cargo.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* VER */}
                            <button
                              type="button"
                              onClick={() =>
                                abrirModal(
                                  cargo,
                                  true
                                )
                              }
                              title="Ver detalle"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* EDITAR */}
                            <button
                              type="button"
                              onClick={() =>
                                cargo.editable &&
                                abrirModal(
                                  cargo,
                                  false
                                )
                              }
                              disabled={!cargo.editable}
                              title={
                                cargo.editable
                                  ? "Editar cargo"
                                  : "Cargo protegido"
                              }
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {/* ELIMINAR */}
                            <button
                              type="button"
                              onClick={() =>
                                confirmarEliminacion(
                                  cargo
                                )
                              }
                              disabled={!cargo.editable}
                              title={
                                cargo.editable
                                  ? "Eliminar cargo"
                                  : "Cargo protegido"
                              }
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            {/* ESTADO */}
                            <button
                              type="button"
                              onClick={() =>
                                alternarEstadoCargo(
                                  cargo
                                )
                              }
                              disabled={
                                !cargo.editable ||
                                cambiandoEstado ===
                                  cargo.id
                              }
                              title={
                                cargo.editable
                                  ? cargo.activo
                                    ? "Desactivar"
                                    : "Activar"
                                  : "Cargo protegido"
                              }
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {cambiandoEstado ===
                              cargo.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : cargo.activo ? (
                                <ToggleRight className="h-5 w-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-gray-400" />
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

      {/* =====================================================
          MODAL CREAR / EDITAR / VER
      ====================================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800 mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />

                {modoLectura
                  ? "Detalle del Cargo"
                  : cargoEditando
                  ? "Editar Cargo"
                  : "Crear Nuevo Cargo"}
              </h3>

              <button
                type="button"
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={guardarCargo}
              className="space-y-6"
            >
              {/* =================================================
                  IDENTIFICACIÓN
              ================================================== */}

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FolderTree className="h-4 w-4 text-blue-600" />

                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Identificación
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Departamento *
                    </label>

                    <select
                      required
                      disabled={modoLectura}
                      value={
                        formCargo.departamento_id
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          departamento_id:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        -- Seleccione un departamento --
                      </option>

                      {departamentos.map(
                        (departamento) => (
                          <option
                            key={departamento.id}
                            value={departamento.id}
                          >
                            {departamento.nombre}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-gray-400" />
                        Código *
                      </label>

                      <input
                        type="text"
                        required
                        maxLength={10}
                        disabled={modoLectura}
                        value={formCargo.codigo}
                        onChange={(e) =>
                          setFormCargo({
                            ...formCargo,
                            codigo:
                              e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="DIR-SIS"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                      />

                      <p className="text-[10px] text-gray-400 mt-1">
                        Máximo 10 caracteres.
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                        Nombre del Cargo *
                      </label>

                      <input
                        type="text"
                        required
                        maxLength={120}
                        disabled={modoLectura}
                        value={formCargo.nombre}
                        onChange={(e) =>
                          setFormCargo({
                            ...formCargo,
                            nombre:
                              e.target.value,
                          })
                        }
                        placeholder="Ej. Director de Sistemas"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Descripción o Funciones
                    </label>

                    <textarea
                      rows={3}
                      disabled={modoLectura}
                      value={
                        formCargo.descripcion
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          descripcion:
                            e.target.value,
                        })
                      }
                      placeholder="Resumen del perfil y responsabilidades..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                    />
                  </div>
                </div>
              </section>

              {/* =================================================
                  JERARQUÍA
              ================================================== */}

              <section className="border-t border-gray-100 dark:border-slate-800 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-blue-600" />

                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Jerarquía Organizacional
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Nivel Organizacional *
                    </label>

                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      disabled={modoLectura}
                      value={
                        formCargo.nivel_organizacional
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          nivel_organizacional:
                            Number(e.target.value) ||
                            1,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                    />

                    <p className="text-[10px] text-gray-400 mt-1">
                      1 representa el nivel de mayor importancia.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Nivel Jerárquico
                    </label>

                    <select
                      disabled={modoLectura}
                      value={
                        formCargo.nivel_jerarquico
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          nivel_jerarquico:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                    >
                      {NIVELES_JERARQUICOS.map(
                        (nivel) => (
                          <option
                            key={nivel}
                            value={nivel}
                          >
                            {nivel}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5 text-gray-400" />
                      Reporta a
                    </label>

                    <select
                      disabled={modoLectura}
                      value={
                        formCargo.reporta_a
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          reporta_a:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                    >
                      <option value="">
                        -- Cargo superior / Ninguno --
                      </option>

                      {cargos
                        .filter(
                          (cargo) =>
                            cargo.id !==
                            cargoEditando?.id &&
                            cargo.activo
                        )
                        .sort(
                          (a, b) =>
                            a.nivel_organizacional -
                            b.nivel_organizacional
                        )
                        .map((cargo) => (
                          <option
                            key={cargo.id}
                            value={cargo.id}
                          >
                            {cargo.codigo} —{" "}
                            {cargo.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <ListOrdered className="h-3.5 w-3.5 text-gray-400" />
                      Orden
                    </label>

                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={modoLectura}
                      value={formCargo.orden}
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          orden:
                            Number(e.target.value) ||
                            1,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                    />
                  </div>
                </div>
              </section>

              {/* =================================================
                  ATRIBUCIONES
              ================================================== */}

              <section className="border-t border-gray-100 dark:border-slate-800 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />

                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Atribuciones del Cargo
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={modoLectura}
                      checked={
                        formCargo.requiere_firma
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          requiere_firma:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />

                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                        Requiere firma
                      </p>

                      <p className="text-[10px] text-gray-400">
                        El cargo requiere participar mediante firma.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={modoLectura}
                      checked={
                        formCargo.puede_aprobar
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          puede_aprobar:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />

                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                        Puede aprobar
                      </p>

                      <p className="text-[10px] text-gray-400">
                        Puede ejercer funciones de aprobación.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={modoLectura}
                      checked={
                        formCargo.puede_iniciar_flujos
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          puede_iniciar_flujos:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />

                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                        Puede iniciar flujos
                      </p>

                      <p className="text-[10px] text-gray-400">
                        Puede iniciar procesos de aprobación.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={modoLectura}
                      checked={
                        formCargo.es_firma_autorizada
                      }
                      onChange={(e) =>
                        setFormCargo({
                          ...formCargo,
                          es_firma_autorizada:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />

                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                        Firma autorizada
                      </p>

                      <p className="text-[10px] text-gray-400">
                        Mantiene la semántica existente de la base de datos.
                      </p>
                    </div>
                  </label>
                </div>
              </section>

              {/* =================================================
                  ESTADO
              ================================================== */}

              <section className="border-t border-gray-100 dark:border-slate-800 pt-5">
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                      Cargo activo
                    </p>

                    <p className="text-[10px] text-gray-400">
                      Los cargos inactivos no deberían utilizarse para nuevas asignaciones.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    disabled={modoLectura}
                    checked={formCargo.activo}
                    onChange={(e) =>
                      setFormCargo({
                        ...formCargo,
                        activo:
                          e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </section>

              {/* =================================================
                  USUARIOS ASIGNADOS
              ================================================== */}

              {modoLectura && (
                <section className="border-t border-gray-100 dark:border-slate-800 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />

                      <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                        Usuarios asignados
                      </h4>
                    </div>

                    {!cargandoUsuarios && !errorUsuarios && (
                      <span className="inline-flex items-center justify-center min-w-7 px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold">
                        {usuariosAsignados.length}
                      </span>
                    )}
                  </div>

                  {cargandoUsuarios ? (
                    <div className="flex items-center justify-center gap-2 p-5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        Cargando usuarios asignados...
                      </span>
                    </div>
                  ) : errorUsuarios ? (
                    <div className="flex items-start gap-2 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          No se pudieron cargar los usuarios.
                        </p>
                        <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                          {errorUsuarios}
                        </p>
                      </div>
                    </div>
                  ) : usuariosAsignados.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        No hay usuarios asignados a este cargo.
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        El cargo está disponible para una nueva asignación.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {usuariosAsignados.map((usuario) => {
                        const nombre =
                          usuario.razon_social ||
                          `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim() ||
                          "Usuario sin nombre";

                        const iniciales = nombre
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((parte) => parte.charAt(0).toUpperCase())
                          .join("");

                        return (
                          <div
                            key={usuario.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          >
                            {usuario.foto_url ? (
                              <img
                                src={usuario.foto_url}
                                alt={nombre}
                                className="h-9 w-9 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[11px] border border-blue-100 dark:border-blue-900 shrink-0">
                                {iniciales || "U"}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {nombre}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                {usuario.numero_identificacion && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {usuario.numero_identificacion}
                                  </span>
                                )}

                                {usuario.email && (
                                  <span className="text-[10px] text-gray-400 truncate">
                                    {usuario.email}
                                  </span>
                                )}
                              </div>
                            </div>

                            {usuario.activo === false && (
                              <span className="shrink-0 px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 text-[9px] font-bold">
                                Inactivo
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* =================================================
                  BOTONES
              ================================================== */}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  {modoLectura
                    ? "Cerrar"
                    : "Cancelar"}
                </button>

                {!modoLectura && (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {guardando && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    {cargoEditando
                      ? "Guardar Cambios"
                      : "Crear Cargo"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL ELIMINAR
      ====================================================== */}

      {modalEliminarOpen &&
        cargoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-100 dark:bg-red-950/50 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    ¿Eliminar Cargo?
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    La API verificará primero las dependencias.
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-slate-300">
                ¿Estás seguro de que deseas eliminar permanentemente el cargo{" "}
                <strong className="text-gray-900 dark:text-white">
                  "{cargoAEliminar.nombre}"
                </strong>
                ?
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (!guardando) {
                      setModalEliminarOpen(false);
                      setCargoAEliminar(null);
                    }
                  }}
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={ejecutarEliminacion}
                  disabled={guardando}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {guardando && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}