"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  ShieldPlus,
  Search,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Power,
  Lock,
  ListOrdered,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Rol {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  activo: boolean | null;
  orden: number | null;
  editable: boolean | null;
  created_at: string | null;
}

export default function ModuloRolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Control de Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // FORMULARIO: Espejo exacto de las columnas de Supabase
  const [formData, setFormData] = useState({
    id: "",
    nombre: "",
    codigo: "",
    descripcion: "",
    activo: true,
    orden: 1,
    editable: true,
  });

  useEffect(() => {
    cargarRoles();
  }, []);

  const cargarRoles = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("orden", { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error("Error al cargar roles:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Manejo de tipos de datos específicos (Booleanos y Números)
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "orden") {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      nombre: "",
      codigo: "",
      descripcion: "",
      activo: true,
      orden: 1,
      editable: true,
    });
    setModoEdicion(false);
    setMensaje(null);
  };

  const abrirModalEditar = (rol: Rol) => {
    setModoEdicion(true);
    setFormData({
      id: rol.id,
      nombre: rol.nombre,
      codigo: rol.codigo || "",
      descripcion: rol.descripcion || "",
      activo: rol.activo ?? true,
      orden: rol.orden || 1,
      editable: rol.editable ?? true,
    });
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);

    // Definimos el payload con EXACTAMENTE las variables de la DB
    const payload = {
      nombre: formData.nombre,
      codigo: formData.codigo.toUpperCase().trim(),
      descripcion: formData.descripcion,
      activo: formData.activo,
      orden: formData.orden,
      editable: formData.editable,
      } as any;

    try {
      if (modoEdicion) {
        const { error } = await supabase
          .from("roles")
          .update(payload)
          .eq("id", formData.id);
        if (error) throw error;
        setMensaje({ tipo: "exito", texto: "Rol actualizado correctamente." });
      } else {
        const { error } = await supabase.from("roles").insert([payload]);
        if (error) throw error;
        setMensaje({ tipo: "exito", texto: "Rol creado exitosamente." });
      }

      cargarRoles();
      setTimeout(() => {
        setModalAbierto(false);
        resetForm();
      }, 1200);
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message || "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (rol: Rol) => {
    try {
      const { error } = await supabase
        .from("roles")
        .update({ activo: !rol.activo })
        .eq("id", rol.id);
      if (error) throw error;
      cargarRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const rolesFiltrados = roles.filter((r) =>
    `${r.nombre} ${r.codigo} ${r.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Roles de Usuario
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Gestión de perfiles de seguridad, jerarquías y códigos de acceso al sistema.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setModalAbierto(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <ShieldPlus className="h-4 w-4" />
          <span>Nuevo Rol</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-0 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Tabla Estilo Profesional */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-gray-400">Cargando esquema de roles...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">ORDEN</th>
                  <th className="px-6 py-3.5">CÓDIGO</th>
                  <th className="px-6 py-3.5">NOMBRE DEL ROL</th>
                  <th className="px-6 py-3.5">DESCRIPCIÓN</th>
                  <th className="px-6 py-3.5">ESTADO</th>
                  <th className="px-6 py-3.5 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {rolesFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4 font-bold text-blue-600">{r.orden}</td>
                    <td className="px-6 py-4 font-mono text-[11px] font-bold">{r.codigo || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                        {r.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">{r.descripcion}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => abrirModalEditar(r)} className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-all">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleEstado(r)} className={`p-1.5 rounded-lg transition-all ${r.activo ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Formulario con TODAS las variables de Supabase */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                {modoEdicion ? "Editar Rol" : "Registrar Nuevo Rol"}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {mensaje && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                  mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {mensaje.tipo === "exito" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {mensaje.texto}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Nombre del Rol *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Código Interno *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    value={formData.codigo}
                    onChange={handleChange}
                    placeholder="EJ: ADMIN_CONTABLE"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descripción de Funciones</label>
                <textarea
                  name="descripcion"
                  rows={2}
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                    <ListOrdered className="h-3 w-3" /> Orden Jerárquico
                  </label>
                  <input
                    type="number"
                    name="orden"
                    value={formData.orden}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div className="flex items-center gap-4 pt-5">
                   <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="activo"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="activo" className="text-xs font-bold text-gray-700 dark:text-slate-300">Activo</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editable"
                      name="editable"
                      checked={formData.editable}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="editable" className="text-xs font-bold text-gray-700 dark:text-slate-300">Editable</label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modoEdicion ? "Actualizar Rol" : "Guardar Rol"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}