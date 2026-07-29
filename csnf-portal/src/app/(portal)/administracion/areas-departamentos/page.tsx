"use client";

import { useState, useEffect } from "react";
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
  Mail,
  UserCheck,
  ListOrdered,
} from "lucide-react";
import { DepartamentoDB } from "@/lib/database/repositories";

interface Area {
  id: string;
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  orden?: number | null;
  activo: boolean | null;
}

interface Departamento {
  id: string;
  area_id: string;
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  responsable_nombre?: string | null;
  email_contacto?: string | null;
  orden?: number | null;
  activo: boolean | null;
  editable: boolean;
  area?: {id: string;
          nombre: string;
  };
  
}

export default function AreasDepartamentosPage() {
  const [tabActiva, setTabActiva] = useState<"areas" | "departamentos">("areas");

  const [areas, setAreas] = useState<Area[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalAreaOpen, setModalAreaOpen] = useState(false);
  const [modalDeptoOpen, setModalDeptoOpen] = useState(false);
  const [areaEditando, setAreaEditando] = useState<Area | null>(null);
  const [deptoEditando, setDeptoEditando] = useState<Departamento | null>(null);
  const [modoLectura, setModoLectura] = useState(false);

  // Formulario Área
  const [formArea, setFormArea] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    orden: 1,
    activo: true,
  });

  // Formulario Departamento
  const [formDepto, setFormDepto] = useState({
    area_id: "",
    codigo: "",
    nombre: "",
    descripcion: "",
    responsable_nombre: "",
    email_contacto: "",
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
      const { data: resAreas, error: errAreas } = await supabase
        .from("areas")
        .select("*")
        .order("orden", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });

      if (errAreas) throw errAreas;

      const { data: resDeptos, error: errDeptos } = await supabase
        .from("departamentos")
        .select("*, area:areas(id, nombre)")
        .order("orden", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });

      if (errDeptos) throw errDeptos;

      setAreas(resAreas || [] as any);
      setDepartamentos(resDeptos || []);
    } catch (error: any) {
      mostrarMensaje("error", "Error al cargar la información: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  // --- ÁREAS ---
  const abrirModalArea = (area?: Area, esLectura = false) => {
    setModoLectura(esLectura);
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

  const guardarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoLectura || !formArea.nombre.trim()) return;

    setGuardando(true);
    try {
      const datosArea = {
        codigo: formArea.codigo.trim() || null,
        nombre: formArea.nombre.trim(),
        descripcion: formArea.descripcion.trim() || null,
        orden: Number(formArea.orden) || 1,
        activo: formArea.activo,
      };

      if (areaEditando) {
        const { data, error } = await supabase
          .from("areas")
          .update(datosArea)
          .eq("id", areaEditando.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("No se pudo actualizar el área. Verifica los permisos RLS en Supabase.");
        }
        mostrarMensaje("exito", "Área actualizada exitosamente.");
      } else {
        const { error } = await supabase.from("areas").insert([datosArea]);
        if (error) throw error;
        mostrarMensaje("exito", "Área creada con éxito.");
      }

      setModalAreaOpen(false);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Ocurrió un error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstadoArea = async (area: Area) => {
    try {
      const { error } = await supabase
        .from("areas")
        .update({ activo: !area.activo })
        .eq("id", area.id);

      if (error) throw error;
      mostrarMensaje("exito", `Área ${!area.activo ? "activada" : "desactivada"}.`);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Error al cambiar estado: " + error.message);
    }
  };

  // --- DEPARTAMENTOS ---
  const abrirModalDepto = (depto?: Departamento, esLectura = false) => {
    setModoLectura(esLectura);
    if (depto) {
      setDeptoEditando(depto);
      setFormDepto({
        area_id: depto.area_id || "",
        codigo: depto.codigo || "",
        nombre: depto.nombre || "",
        descripcion: depto.descripcion || "",
        responsable_nombre: depto.responsable_nombre || "",
        email_contacto: depto.email_contacto || "",
        orden: depto.orden || 1,
        activo: depto.activo ?? true,
      });
    } else {
      setDeptoEditando(null);
      setFormDepto({
        area_id: areas.length > 0 ? areas[0].id : "",
        codigo: "",
        nombre: "",
        descripcion: "",
        responsable_nombre: "",
        email_contacto: "",
        orden: departamentos.length + 1,
        activo: true,
      });
    }
    setModalDeptoOpen(true);
  };

  const guardarDepto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoLectura || !formDepto.nombre.trim() || !formDepto.area_id) return;

    setGuardando(true);
    try {
      const datosDepto: DepartamentoDB = {
        area_id: formDepto.area_id,
        codigo: formDepto.codigo.trim() || null,
        nombre: formDepto.nombre.trim(),
        descripcion: formDepto.descripcion.trim() || null,
        responsable_nombre: formDepto.responsable_nombre.trim() || null,
        email_contacto: formDepto.email_contacto.trim() || null,
        orden: Number(formDepto.orden) || 1,
        activo: formDepto.activo,
      } as any;

      if (deptoEditando) {
        const { data, error } = await supabase
          .from("departamentos")
          .update(datosDepto)
          .eq("id", deptoEditando.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("No se pudo actualizar el departamento. Verifica los permisos RLS en Supabase.");
        }
        mostrarMensaje("exito", "Departamento actualizado exitosamente.");
      } else {
        const { error } = await supabase.from("departamentos").insert([datosDepto]);
        if (error) throw error;
        mostrarMensaje("exito", "Departamento creado con éxito.");
      }

      setModalDeptoOpen(false);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Ocurrió un error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstadoDepto = async (depto: Departamento) => {
    try {
      const { error } = await supabase
        .from("departamentos")
        .update({ activo: !depto.activo })
        .eq("id", depto.id);

      if (error) throw error;
      mostrarMensaje("exito", `Departamento ${!depto.activo ? "activado" : "desactivado"}.`);
      await cargarDatos();
    } catch (error: any) {
      mostrarMensaje("error", "Error al cambiar estado: " + error.message);
    }
  };

  // Filtros
  const areasFiltradas = areas.filter(
    (a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.codigo && a.codigo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (a.descripcion && a.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const deptosFiltrados = departamentos.filter(
    (d) =>
      d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (d.codigo && d.codigo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (d.area?.nombre && d.area.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (d.responsable_nombre && d.responsable_nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            Áreas y Departamentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Administración de la estructura organizacional
          </p>
        </div>

        <div>
          {tabActiva === "areas" ? (
            <button
              onClick={() => abrirModalArea(undefined, false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              Nueva Área
            </button>
          ) : (
            <button
              onClick={() => abrirModalDepto(undefined, false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              Nuevo Departamento
            </button>
          )}
        </div>
      </div>

      {/* Alerta */}
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => {
            setTabActiva("areas");
            setBusqueda("");
          }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            tabActiva === "areas"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Áreas Generales ({areas.length})
        </button>

        <button
          onClick={() => {
            setTabActiva("departamentos");
            setBusqueda("");
          }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            tabActiva === "departamentos"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FolderTree className="h-4 w-4" />
          Departamentos ({departamentos.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={
            tabActiva === "areas"
              ? "Buscar por nombre, código o descripción de áreas..."
              : "Buscar por departamento, área, código o responsable..."
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {cargando ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* TAB ÁREAS */}
          {tabActiva === "areas" && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Nombre del Área</th>
                      <th className="py-3.5 px-4">Descripción</th>
                      <th className="py-3.5 px-4 text-center">Orden</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                    {areasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                          No se encontraron áreas registradas.
                        </td>
                      </tr>
                    ) : (
                      areasFiltradas.map((area) => (
                        <tr
                          key={area.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-semibold text-xs text-gray-600 dark:text-slate-400">
                            {area.codigo || "-"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                            {area.nombre}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs truncate">
                            {area.descripcion || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-gray-600 dark:text-slate-400">
                            {area.orden || 1}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                area.activo
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {area.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Ver (Solo Lectura) */}
                              <button
                                onClick={() => abrirModalArea(area, true)}
                                title="Ver Detalle"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {/* Botón Editar */}
                              <button
                                onClick={() => abrirModalArea(area, false)}
                                title="Editar Área"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {/* Switch Estado */}
                              <button
                                onClick={() => alternarEstadoArea(area)}
                                title={area.activo ? "Desactivar" : "Activar"}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
                              >
                                {area.activo ? (
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

          {/* TAB DEPARTAMENTOS */}
          {tabActiva === "departamentos" && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Departamento</th>
                      <th className="py-3.5 px-4">Área Asignada</th>
                      <th className="py-3.5 px-4">Responsable / Contacto</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                    {deptosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                          No se encontraron departamentos registrados.
                        </td>
                      </tr>
                    ) : (
                      deptosFiltrados.map((depto) => (
                        <tr
                          key={depto.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-semibold text-xs text-gray-600 dark:text-slate-400">
                            {depto.codigo || "-"}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-gray-900 dark:text-white">{depto.nombre}</p>
                            {depto.descripcion && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                                {depto.descripcion}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400 text-xs">
                            {depto.area?.nombre || "Sin Asignar"}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {depto.responsable_nombre || "-"}
                            </p>
                            <p className="text-gray-500 dark:text-slate-400">
                              {depto.email_contacto || ""}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                depto.activo
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {depto.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Ver (Solo Lectura) */}
                              <button
                                onClick={() => abrirModalDepto(depto, true)}
                                title="Ver Detalle"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {/* Botón Editar */}
                              <button
                                onClick={() => abrirModalDepto(depto, false)}
                                title="Editar Departamento"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {/* Switch Estado */}
                              <button
                                onClick={() => alternarEstadoDepto(depto)}
                                title={depto.activo ? "Desactivar" : "Activar"}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
                              >
                                {depto.activo ? (
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
        </>
      )}

      {/* --- MODAL DE ÁREA --- */}
      {modalAreaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {modoLectura
                  ? "Detalle del Área"
                  : areaEditando
                  ? "Editar Área"
                  : "Crear Nueva Área"}
              </h3>
              <button
                onClick={() => setModalAreaOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarArea} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    Código
                  </label>
                  <input
                    type="text"
                    disabled={modoLectura}
                    value={formArea.codigo}
                    onChange={(e) => setFormArea({ ...formArea, codigo: e.target.value })}
                    placeholder="DIR-EJ"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Nombre del Área *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modoLectura}
                    value={formArea.nombre}
                    onChange={(e) => setFormArea({ ...formArea, nombre: e.target.value })}
                    placeholder="Ej. Dirección Ejecutiva"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  disabled={modoLectura}
                  value={formArea.descripcion}
                  onChange={(e) => setFormArea({ ...formArea, descripcion: e.target.value })}
                  placeholder="Detalle de funciones o alcance del área..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <ListOrdered className="h-3.5 w-3.5 text-gray-400" />
                    Orden
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={modoLectura}
                    value={formArea.orden}
                    onChange={(e) => setFormArea({ ...formArea, orden: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="activoArea"
                    disabled={modoLectura}
                    checked={formArea.activo}
                    onChange={(e) => setFormArea({ ...formArea, activo: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="activoArea" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    Área Activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAreaOpen(false)}
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
                    {areaEditando ? "Guardar Cambios" : "Crear Área"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE DEPARTAMENTO --- */}
      {modalDeptoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-blue-600" />
                {modoLectura
                  ? "Detalle del Departamento"
                  : deptoEditando
                  ? "Editar Departamento"
                  : "Crear Nuevo Departamento"}
              </h3>
              <button
                onClick={() => setModalDeptoOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarDepto} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Área Pertenece *
                </label>
                <select
                  required
                  disabled={modoLectura}
                  value={formDepto.area_id}
                  onChange={(e) => setFormDepto({ ...formDepto, area_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    -- Seleccione un Área --
                  </option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
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
                    value={formDepto.codigo}
                    onChange={(e) => setFormDepto({ ...formDepto, codigo: e.target.value })}
                    placeholder="DEP-SIS"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Nombre del Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modoLectura}
                    value={formDepto.nombre}
                    onChange={(e) => setFormDepto({ ...formDepto, nombre: e.target.value })}
                    placeholder="Ej. Departamento de Sistemas"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  disabled={modoLectura}
                  value={formDepto.descripcion}
                  onChange={(e) => setFormDepto({ ...formDepto, descripcion: e.target.value })}
                  placeholder="Funciones principales del departamento..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                    Responsable
                  </label>
                  <input
                    type="text"
                    disabled={modoLectura}
                    value={formDepto.responsable_nombre}
                    onChange={(e) => setFormDepto({ ...formDepto, responsable_nombre: e.target.value })}
                    placeholder="Nombre del encargado"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    Correo de Contacto
                  </label>
                  <input
                    type="email"
                    disabled={modoLectura}
                    value={formDepto.email_contacto}
                    onChange={(e) => setFormDepto({ ...formDepto, email_contacto: e.target.value })}
                    placeholder="sistemas@csnf.org"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <ListOrdered className="h-3.5 w-3.5 text-gray-400" />
                    Orden
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={modoLectura}
                    value={formDepto.orden}
                    onChange={(e) => setFormDepto({ ...formDepto, orden: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="activoDepto"
                    disabled={modoLectura}
                    checked={formDepto.activo}
                    onChange={(e) => setFormDepto({ ...formDepto, activo: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="activoDepto" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    Departamento Activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalDeptoOpen(false)}
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
                    {deptoEditando ? "Guardar Cambios" : "Crear Departamento"}
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