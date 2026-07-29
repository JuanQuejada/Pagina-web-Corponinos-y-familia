"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface Departamento {
  id: string;
  nombre: string;
}

interface Cargo {
  id: string;
  departamento_id?: string | undefined;
  codigo?: string | undefined;
  nombre: string;
  nivel_jerarquico?: string | null;
  descripcion?: string | null;
  es_firma_autorizada?: boolean | null;
  orden?: number;
  activo: boolean;
  departamento: {
    id: string;
    nombre: string;
  };
}

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [cargoEditando, setCargoEditando] = useState<Cargo | null>(null);
  const [cargoAEliminar, setCargoAEliminar] = useState<Cargo | null>(null);
  const [modoLectura, setModoLectura] = useState(false);

  // Formulario
  const [formCargo, setFormCargo] = useState({
    departamento_id: "",
    codigo: "",
    nombre: "",
    nivel_jerarquico: "Operativo",
    descripcion: "",
    es_firma_autorizada: false,
    orden: 1,
    activo: true,
  });

  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const mostrarMensaje = (tipo: "exito" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: resDeptos, error: errDeptos } = await supabase
        .from("departamentos")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (errDeptos) throw errDeptos;
      setDepartamentos(resDeptos || []);

      const { data: resCargos, error: errCargos } = await supabase
        .from("cargos")
        .select("*, departamento:departamentos(id, nombre)")
        .order("orden", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });

      if (errCargos) throw errCargos;
      setCargos(resCargos || []);
    } catch (error: any) {
      mostrarMensaje("error", "Error al cargar los cargos: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (cargo?: Cargo, esLectura = false) => {
    setModoLectura(esLectura);
    if (cargo) {
      setCargoEditando(cargo);
      setFormCargo({
        departamento_id: cargo.departamento_id || "",
        codigo: cargo.codigo || "",
        nombre: cargo.nombre || "",
        nivel_jerarquico: cargo.nivel_jerarquico || "Operativo",
        descripcion: cargo.descripcion || "",
        es_firma_autorizada: cargo.es_firma_autorizada ?? false,
        orden: cargo.orden || 1,
        activo: cargo.activo ?? true,
      });
    } else {
      setCargoEditando(null);
      setFormCargo({
        departamento_id: departamentos.length > 0 ? departamentos[0].id : "",
        codigo: "",
        nombre: "",
        nivel_jerarquico: "Operativo",
        descripcion: "",
        es_firma_autorizada: false,
        orden: cargos.length + 1,
        activo: true,
      });
    }
    setModalOpen(true);
  };

  const guardarCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoLectura || !formCargo.nombre.trim()) return;

    setGuardando(true);
    try {
      const datosCargo = {
        departamento_id: formCargo.departamento_id || null,
        codigo: formCargo.codigo.trim() || null,
        nombre: formCargo.nombre.trim(),
        nivel_jerarquico: formCargo.nivel_jerarquico,
        descripcion: formCargo.descripcion.trim() || null,
        es_firma_autorizada: formCargo.es_firma_autorizada,
        orden: Number(formCargo.orden) || 1,
        activo: formCargo.activo,
      };

      if (cargoEditando) {
        const { data, error } = await supabase
          .from("cargos")
          .update(datosCargo as any)
          .eq("id", cargoEditando.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("No se pudo actualizar el cargo. Verifica las políticas RLS en Supabase.");
        }
        mostrarMensaje("exito", "Cargo actualizado exitosamente.");
      } else {
        const { error } = await supabase.from("cargos").insert([datosCargo as any]);
        if (error) throw error;
        mostrarMensaje("exito", "Cargo creado con éxito.");
      }

      setModalOpen(false);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Ocurrió un error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  // --- ELIMINACIÓN FÍSICA ---
  const confirmarEliminacion = (cargo: Cargo) => {
    setCargoAEliminar(cargo);
    setModalEliminarOpen(true);
  };

  const ejecutarEliminacion = async () => {
    if (!cargoAEliminar) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from("cargos")
        .delete()
        .eq("id", cargoAEliminar.id);

      if (error) throw error;

      mostrarMensaje("exito", `El cargo "${cargoAEliminar.nombre}" fue eliminado correctamente.`);
      setModalEliminarOpen(false);
      setCargoAEliminar(null);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "No se pudo eliminar el cargo: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstadoCargo = async (cargo: Cargo) => {
    try {
      const { error } = await supabase
        .from("cargos")
        .update({ activo: !cargo.activo })
        .eq("id", cargo.id);

      if (error) throw error;
      mostrarMensaje("exito", `Cargo ${!cargo.activo ? "activado" : "desactivado"}.`);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Error al cambiar estado: " + error.message);
    }
  };

  const cargosFiltrados = cargos.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.codigo && c.codigo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (c.nivel_jerarquico && c.nivel_jerarquico.toLowerCase().includes(busqueda.toLowerCase())) ||
      (c.departamento?.nombre && c.departamento.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-blue-600" />
            Cargos Organizacionales
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Definición de roles, niveles jerárquicos y atribuciones de firma
          </p>
        </div>

        <button
          onClick={() => abrirModal(undefined, false)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cargo
        </button>
      </div>

      {/* Alerta de notificación */}
      {mensaje && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium transition-all ${
            mensaje.tipo === "exito"
              ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cargo, código, nivel jerárquico o departamento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla de Cargos */}
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
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Nombre del Cargo</th>
                  <th className="py-3.5 px-4">Departamento</th>
                  <th className="py-3.5 px-4">Nivel Jerárquico</th>
                  <th className="py-3.5 px-4 text-center">Firma Oficial</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {cargosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                      No se encontraron cargos registrados.
                    </td>
                  </tr>
                ) : (
                  cargosFiltrados.map((cargo) => (
                    <tr
                      key={cargo.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-xs text-gray-600 dark:text-slate-400">
                        {cargo.codigo || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white">{cargo.nombre}</p>
                        {cargo.descripcion && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                            {cargo.descripcion}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {cargo.departamento?.nombre || "General / Sin Asignar"}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold">
                          {cargo.nivel_jerarquico || "Operativo"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {cargo.es_firma_autorizada ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                            <FileSignature className="h-3.5 w-3.5" />
                            Sí
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            cargo.activo
                              ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {cargo.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Detalle */}
                          <button
                            onClick={() => abrirModal(cargo, true)}
                            title="Ver Detalle"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {/* Editar */}
                          <button
                            onClick={() => abrirModal(cargo, false)}
                            title="Editar Cargo"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {/* Eliminar */}
                          <button
                            onClick={() => confirmarEliminacion(cargo)}
                            title="Eliminar Cargo"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {/* Activar/Desactivar */}
                          <button
                            onClick={() => alternarEstadoCargo(cargo)}
                            title={cargo.activo ? "Desactivar" : "Activar"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
                          >
                            {cargo.activo ? (
                              <ToggleRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL CREAR / EDITAR / VER CARGO --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                {modoLectura
                  ? "Detalle del Cargo"
                  : cargoEditando
                  ? "Editar Cargo"
                  : "Crear Nuevo Cargo"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarCargo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FolderTree className="h-3.5 w-3.5 text-gray-400" />
                  Departamento Asociado
                </label>
                <select
                  disabled={modoLectura}
                  value={formCargo.departamento_id}
                  onChange={(e) => setFormCargo({ ...formCargo, departamento_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Sin Departamento Específico (General) --</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    Código
                  </label>
                  <input
                    type="text"
                    disabled={modoLectura}
                    value={formCargo.codigo}
                    onChange={(e) => setFormCargo({ ...formCargo, codigo: e.target.value })}
                    placeholder="DIR-SIS"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Nombre del Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modoLectura}
                    value={formCargo.nombre}
                    onChange={(e) => setFormCargo({ ...formCargo, nombre: e.target.value })}
                    placeholder="Ej. Director de Sistemas"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    Nivel Jerárquico
                  </label>
                  <select
                    disabled={modoLectura}
                    value={formCargo.nivel_jerarquico}
                    onChange={(e) => setFormCargo({ ...formCargo, nivel_jerarquico: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  >
                    <option value="Directivo">Directivo</option>
                    <option value="Estratégico">Estratégico</option>
                    <option value="Táctico / Coordinación">Táctico / Coordinación</option>
                    <option value="Operativo">Operativo</option>
                    <option value="Asistencial">Asistencial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <ListOrdered className="h-3.5 w-3.5 text-gray-400" />
                    Orden
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={modoLectura}
                    value={formCargo.orden}
                    onChange={(e) => setFormCargo({ ...formCargo, orden: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Descripción o Funciones
                </label>
                <textarea
                  rows={2}
                  disabled={modoLectura}
                  value={formCargo.descripcion}
                  onChange={(e) => setFormCargo({ ...formCargo, descripcion: e.target.value })}
                  placeholder="Resumen del perfil y responsabilidades..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="esFirma"
                    disabled={modoLectura}
                    checked={formCargo.es_firma_autorizada}
                    onChange={(e) => setFormCargo({ ...formCargo, es_firma_autorizada: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="esFirma" className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Requiere Firma Autorizada
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activoCargo"
                    disabled={modoLectura}
                    checked={formCargo.activo}
                    onChange={(e) => setFormCargo({ ...formCargo, activo: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="activoCargo" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    Cargo Activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  {modoLectura ? "Cerrar" : "Cancelar"}
                </button>
                {!modoLectura && (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                    {cargoEditando ? "Guardar Cambios" : "Crear Cargo"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAR ELIMINACIÓN --- */}
      {modalEliminarOpen && cargoAEliminar && (
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
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300">
              ¿Estás seguro de que deseas eliminar permanentemente el cargo{" "}
              <strong className="text-gray-900 dark:text-white">"{cargoAEliminar.nombre}"</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalEliminarOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacion}
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}