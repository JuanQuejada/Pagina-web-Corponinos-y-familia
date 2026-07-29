"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, 
  Layers, 
  Plus, 
  Pencil, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Search
} from "lucide-react";

interface Area {
  id: string;
  nombre: string;
  codigo?: string | null;
  descripcion?: string | null;
  activo: boolean | null;
  orden?: number | null;
}

interface Departamento {
  id: string;
  area_id: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  activo: boolean;
  areas?: { nombre: string } | null;
}

export default function AreasDepartamentosManager() {
  const [tabActiva, setTabActiva] = useState<"areas" | "departamentos">("areas");
  const [areas, setAreas] = useState<Area[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Cargar datos desde Supabase
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: areasData, error: errAreas } = await supabase
        .from("areas")
        .select("*")
        .order("orden", { ascending: true });

      const { data: deptosData, error: errDeptos } = await supabase
        .from("departamentos")
        .select("*, areas(nombre)")
        .order("nombre", { ascending: true });

      if (errAreas) throw errAreas;
      if (errDeptos) throw errDeptos;

      // Mapeamos los datos para convertir 'null' en 'undefined' y evitar errores de TypeScript
      setAreas(
  (areasData || []).map((area) => ({
    ...area,
    codigo: area.codigo ?? undefined,
    descripcion: area.descripcion ?? undefined,
    activo: Boolean(area.activo), // Asegura que sea boolean puro
  }))
);

      setDepartamentos(
        (deptosData || []).map((depto) => ({
          ...depto,
          codigo: depto.codigo ?? undefined,
          descripcion: depto.descripcion ?? undefined,
          activo: depto.activo ?? true,
        }))
      );
    } catch (error) {
      console.error("Error cargando estructura organizacional:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const areasFiltradas = areas.filter((a) =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const deptosFiltrados = departamentos.filter((d) =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Áreas y Departamentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Gestiona la estructura institucional y sus divisiones operativas.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nueva {tabActiva === "areas" ? "Área" : "Departamento"}
        </button>
      </div>

      {/* Tabs y Barra de Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setTabActiva("areas")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tabActiva === "areas"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Áreas ({areas.length})
          </button>
          <button
            onClick={() => setTabActiva("departamentos")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tabActiva === "departamentos"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Departamentos ({departamentos.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Buscar ${tabActiva}...`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contenido / Tablas */}
      {cargando ? (
        <div className="flex h-48 w-full items-center justify-center gap-2 text-gray-500 dark:text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span>Cargando registros...</span>
        </div>
      ) : tabActiva === "areas" ? (
        <TablaAreas areas={areasFiltradas} />
      ) : (
        <TablaDepartamentos departamentos={deptosFiltrados} />
      )}
    </div>
  );
}

{/* Componente Tabla de Áreas */}
function TablaAreas({ areas }: { areas: Area[] }) {
  if (areas.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl border-dashed border-gray-300 dark:border-slate-800">
        <p className="text-gray-500 dark:text-slate-400">No se encontraron áreas registradas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
        <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
          <tr>
            <th className="px-6 py-3 font-semibold">Código</th>
            <th className="px-6 py-3 font-semibold">Nombre</th>
            <th className="px-6 py-3 font-semibold">Descripción</th>
            <th className="px-6 py-3 font-semibold">Estado</th>
            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
          {areas.map((area) => (
            <tr key={area.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                {area.codigo || "N/A"}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {area.nombre}
              </td>
              <td className="px-6 py-4 text-xs max-w-xs truncate">
                {area.descripcion || "Sin descripción"}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  area.activo 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {area.activo ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {area.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

{/* Componente Tabla de Departamentos */}
function TablaDepartamentos({ departamentos }: { departamentos: Departamento[] }) {
  if (departamentos.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl border-dashed border-gray-300 dark:border-slate-800">
        <p className="text-gray-500 dark:text-slate-400">No se encontraron departamentos registrados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
        <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
          <tr>
            <th className="px-6 py-3 font-semibold">Código</th>
            <th className="px-6 py-3 font-semibold">Departamento</th>
            <th className="px-6 py-3 font-semibold">Área Perteneciente</th>
            <th className="px-6 py-3 font-semibold">Estado</th>
            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
          {departamentos.map((depto) => (
            <tr key={depto.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                {depto.codigo || "N/A"}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {depto.nombre}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {depto.areas?.nombre || "Sin área"}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  depto.activo 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {depto.activo ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {depto.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}