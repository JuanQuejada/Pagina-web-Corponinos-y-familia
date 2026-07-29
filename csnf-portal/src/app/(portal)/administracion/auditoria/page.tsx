"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Search,
  Loader2,
  User,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  Database,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LogAuditoria {
  id: string;
  usuario_id: string | null;
  accion: string;
  modulo: string;
  descripcion: string;
  ip_origen?: string | null;
  created_at: string;
  usuarios?: {
    nombres?: string | null;
    apellidos?: string | null;
    email?: string | null;
    razon_social?: string | null;
  };
}

export default function ModuloAuditoriaYExportacionPage() {
  // Control de Pestañas ("auditoria" o "exportacion")
  const [pestanaActiva, setPestanaActiva] = useState<"auditoria" | "exportacion">("auditoria");

  // Estados de Auditoría
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [cargandoLogs, setCargandoLogs] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("TODOS");

  // Estados de Exportación
  const [moduloSeleccionado, setModuloSeleccionado] = useState("usuarios");
  const [exportando, setExportando] = useState(false);
  const [mensajeExport, setMensajeExport] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    setCargandoLogs(true);
    try {
      const { data: listaLogs, error } = await supabase
        .from("auditoria_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: listaUsuarios } = await supabase
        .from("usuarios")
        .select("id, nombres, apellidos, razon_social, email");

      const mapaUsuarios = new Map((listaUsuarios || []).map((u) => [u.id, u]));

      const logsCompletos = (listaLogs || []).map((log) => ({
        ...log,
        usuarios: log.usuario_id ? mapaUsuarios.get(log.usuario_id) : undefined,
      }));

      setLogs(logsCompletos);
    } catch (err) {
      console.error("Error al cargar auditoría:", err);
    } finally {
      setCargandoLogs(false);
    }
  };

  // Función para convertir datos JSON a CSV y descargarlos
  const descargarCSV = (datos: any[], nombreArchivo: string) => {
    if (!datos || datos.length === 0) {
      setMensajeExport({ tipo: "error", texto: "No hay registros disponibles para exportar en este módulo." });
      return;
    }

    try {
      // Extraer las cabeceras de las llaves del objeto
      const keys = Object.keys(datos[0]);
      const csvContent = [
        keys.join(","), // Cabecera
        ...datos.map((row) =>
          keys.map((key) => {
            let val = row[key];
            if (typeof val === "object" && val !== null) val = JSON.stringify(val); // por si hay relaciones anidadas
            return `"${("" + (val ?? "")).replace(/"/g, '""')}"`;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMensajeExport({ tipo: "exito", texto: `Archivo "${nombreArchivo}.csv" exportado con éxito.` });
    } catch (err) {
      console.error(err);
      setMensajeExport({ tipo: "error", texto: "Ocurrió un error al generar el archivo CSV." });
    }
  };

  // Manejador central de exportación según el módulo escogido
  const ejecutarExportacion = async () => {
    setExportando(true);
    setMensajeExport(null);

    try {
      let tablaObjetivo = "";
      let nombreReporte = "";

      switch (moduloSeleccionado) {
        case "usuarios":
          tablaObjetivo = "usuarios";
          nombreReporte = "reporte_usuarios";
          break;
        case "roles":
          tablaObjetivo = "roles";
          nombreReporte = "reporte_roles";
          break;
        case "departamentos":
          tablaObjetivo = "departamentos";
          nombreReporte = "reporte_departamentos";
          break;
        case "cargos":
          tablaObjetivo = "cargos";
          nombreReporte = "reporte_cargos";
          break;
        case "auditoria":
          tablaObjetivo = "auditoria_logs";
          nombreReporte = "reporte_auditoria_sistema";
          break;
        default:
          throw new Error("Módulo de exportación no válido.");
      }

      const { data, error } = await supabase.from(tablaObjetivo as any).select("*");
      if (error) throw error;

      descargarCSV(data || [], nombreReporte);
    } catch (error: any) {
      setMensajeExport({ tipo: "error", texto: error.message || "Error al conectar con la base de datos." });
    } finally {
      setExportando(false);
    }
  };

  const logsFiltrados = logs.filter((l) => {
    const termino = busqueda.toLowerCase();
    const usuarioNombre = `${l.usuarios?.nombres || ""} ${l.usuarios?.apellidos || ""} ${l.usuarios?.razon_social || ""} ${l.usuarios?.email || ""}`.toLowerCase();
    const descripcion = (l.descripcion || "").toLowerCase();
    const accion = (l.accion || "").toLowerCase();
    
    const coincideTexto = usuarioNombre.includes(termino) || descripcion.includes(termino) || accion.includes(termino);
    const coincideModulo = filtroModulo === "TODOS" || l.modulo === filtroModulo;

    return coincideTexto && coincideModulo;
  });

  const obtenerColorAccion = (accion: string) => {
    switch (accion.toUpperCase()) {
      case "CREAR": return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400";
      case "EDITAR": return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
      case "ELIMINAR": return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Auditoría y Gestión de Datos
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Supervisa las acciones del sistema o extrae respaldos de información en formato estructurado.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación (Tabs) */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setPestanaActiva("auditoria")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            pestanaActiva === "auditoria"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          }`}
        >
          <Activity className="h-4 w-4" />
          Registro de Auditoría
        </button>
        <button
          onClick={() => setPestanaActiva("exportacion")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            pestanaActiva === "exportacion"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportación de Módulos
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: AUDITORÍA */}
      {pestanaActiva === "auditoria" && (
        <div className="space-y-6">
          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por usuario, acción o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-0 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-0 outline-none"
              >
                <option value="TODOS">Todos los Módulos</option>
                <option value="USUARIOS">Usuarios</option>
                <option value="ROLES">Roles</option>
                <option value="DOCUMENTOS">Documentos</option>
                <option value="CONFIGURACION">Configuración</option>
              </select>
            </div>
          </div>

          {/* Tabla de Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {cargandoLogs ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-xs text-gray-400">Cargando registros de auditoría...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
                  <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">FECHA Y HORA</th>
                      <th className="px-6 py-3.5">USUARIO</th>
                      <th className="px-6 py-3.5">MÓDULO</th>
                      <th className="px-6 py-3.5">ACCIÓN</th>
                      <th className="px-6 py-3.5">DESCRIPCIÓN DEL EVENTO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {logsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400">
                          No se encontraron registros de auditoría que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      logsFiltrados.map((l) => {
                        const nombreUsuario =
                          l.usuarios?.razon_social ||
                          `${l.usuarios?.nombres || ""} ${l.usuarios?.apellidos || ""}`.trim() ||
                          "Sistema / Desconocido";

                        const fechaFormateada = new Date(l.created_at).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        });

                        return (
                          <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="px-6 py-4 font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              {fechaFormateada}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-blue-500" />
                                {nombreUsuario}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-700 dark:text-slate-300">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px]">
                                {l.modulo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${obtenerColorAccion(l.accion)}`}>
                                {l.accion}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                              {l.descripcion}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: EXPORTACIÓN DE DATOS */}
      {pestanaActiva === "exportacion" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl mx-auto flex items-center justify-center border border-blue-100 dark:border-blue-900">
              <Database className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Centro de Exportación de Datos</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Selecciona el módulo del cual deseas extraer la información completa. El archivo se descargará en formato CSV compatible con Excel y Hojas de Cálculo.
            </p>
          </div>

          {mensajeExport && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              mensajeExport.tipo === "exito" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {mensajeExport.tipo === "exito" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {mensajeExport.texto || mensajeExport.texto}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-slate-300">
                Módulo a Exportar:
              </label>
              <select
                value={moduloSeleccionado}
                onChange={(e) => setModuloSeleccionado(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
              >
                <option value="usuarios">Módulo de Usuarios</option>
                <option value="roles">Módulo de Roles y Permisos</option>
                <option value="departamentos">Módulo de Departamentos</option>
                <option value="cargos">Módulo de Cargos</option>
                <option value="auditoria">Logs de Auditoría (Historial Completo)</option>
              </select>
            </div>

            <button
              onClick={ejecutarExportacion}
              disabled={exportando}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{exportando ? "Generando Archivo..." : "Descargar Reporte en CSV"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}