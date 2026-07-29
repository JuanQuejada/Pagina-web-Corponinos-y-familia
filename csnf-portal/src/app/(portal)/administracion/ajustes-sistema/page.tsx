"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Building2,
  Palette,
  FolderGit2,
  Sliders,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ConfiguracionSistema {
  id: string;
  nombre_entidad: string;
  sigla: string;
  nit: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  telefono: string;
  correo_institucional: string;
  sitio_web: string;
  nombre_portal: string;
  version_portal: string;
  idioma: string;
  zona_horaria: string;
  formato_fecha: string;
  logo_principal: string;
  logo_blanco: string;
  favicon: string;
  color_primario: string;
  color_secundario: string;
  carpeta_raiz_drive: string;
  carpeta_temporal_drive: string;
  permitir_registro: boolean;
  portal_en_mantenimiento: boolean;
  activo: boolean;
}

export default function ModuloAjustesPage() {
  const [pestana, setPestana] = useState<"general" | "marca" | "drive" | "sistema">("general");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Formulario espejo exacto de la tabla en Supabase
  const [formData, setFormData] = useState<ConfiguracionSistema>({
    id: "",
    nombre_entidad: "",
    sigla: "",
    nit: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    pais: "",
    telefono: "",
    correo_institucional: "",
    sitio_web: "",
    nombre_portal: "",
    version_portal: "1.0.0",
    idioma: "es-CO",
    zona_horaria: "America/Bogota",
    formato_fecha: "DD/MM/YYYY",
    logo_principal: "",
    logo_blanco: "",
    favicon: "",
    color_primario: "#2563eb",
    color_secundario: "#1e40af",
    carpeta_raiz_drive: "",
    carpeta_temporal_drive: "",
    permitir_registro: false,
    portal_en_mantenimiento: false,
    activo: true,
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("configuracion_sistema")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error al cargar ajustes:", error);
      } else if (data) {
        setFormData({
          id: data.id ?? "",
          nombre_entidad: data.nombre_entidad ?? "",
          sigla: data.sigla ?? "",
          nit: data.nit ?? "",
          direccion: data.direccion ?? "",
          ciudad: data.ciudad ?? "",
          departamento: data.departamento ?? "",
          pais: data.pais ?? "",
          telefono: data.telefono ?? "",
          correo_institucional: data.correo_institucional ?? "",
          sitio_web: data.sitio_web ?? "",
          nombre_portal: data.nombre_portal ?? "",
          version_portal: data.version_portal ?? "1.0.0",
          idioma: data.idioma ?? "es-CO",
          zona_horaria: data.zona_horaria ?? "America/Bogota",
          formato_fecha: data.formato_fecha ?? "DD/MM/YYYY",
          logo_principal: data.logo_principal ?? "",
          logo_blanco: data.logo_blanco ?? "",
          favicon: data.favicon ?? "",
          color_primario: data.color_primario ?? "#2563eb",
          color_secundario: data.color_secundario ?? "#1e40af",
          carpeta_raiz_drive: data.carpeta_raiz_drive ?? "",
          carpeta_temporal_drive: data.carpeta_temporal_drive ?? "",
          permitir_registro: data.permitir_registro ?? false,
          portal_en_mantenimiento: data.portal_en_mantenimiento ?? false,
          activo: data.activo ?? true,
        });
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);

    try {
      const payload = {
        nombre_entidad: formData.nombre_entidad,
        sigla: formData.sigla,
        nit: formData.nit,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        departamento: formData.departamento,
        pais: formData.pais,
        telefono: formData.telefono,
        correo_institucional: formData.correo_institucional,
        sitio_web: formData.sitio_web,
        nombre_portal: formData.nombre_portal,
        version_portal: formData.version_portal,
        idioma: formData.idioma,
        zona_horaria: formData.zona_horaria,
        formato_fecha: formData.formato_fecha,
        logo_principal: formData.logo_principal,
        logo_blanco: formData.logo_blanco,
        favicon: formData.favicon,
        color_primario: formData.color_primario,
        color_secundario: formData.color_secundario,
        carpeta_raiz_drive: formData.carpeta_raiz_drive,
        carpeta_temporal_drive: formData.carpeta_temporal_drive,
        permitir_registro: formData.permitir_registro,
        portal_en_mantenimiento: formData.portal_en_mantenimiento,
        activo: formData.activo,
        updated_at: new Date().toISOString(),
      };

      if (formData.id) {
        const { error } = await supabase
          .from("configuracion_sistema")
          .update(payload)
          .eq("id", formData.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("configuracion_sistema")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            id: data.id ?? "",
            nombre_entidad: data.nombre_entidad ?? "",
            sigla: data.sigla ?? "",
            nit: data.nit ?? "",
            direccion: data.direccion ?? "",
            ciudad: data.ciudad ?? "",
            departamento: data.departamento ?? "",
            pais: data.pais ?? "",
            telefono: data.telefono ?? "",
            correo_institucional: data.correo_institucional ?? "",
            sitio_web: data.sitio_web ?? "",
            nombre_portal: data.nombre_portal ?? "",
            version_portal: data.version_portal ?? "1.0.0",
            idioma: data.idioma ?? "es-CO",
            zona_horaria: data.zona_horaria ?? "America/Bogota",
            formato_fecha: data.formato_fecha ?? "DD/MM/YYYY",
            logo_principal: data.logo_principal ?? "",
            logo_blanco: data.logo_blanco ?? "",
            favicon: data.favicon ?? "",
            color_primario: data.color_primario ?? "#2563eb",
            color_secundario: data.color_secundario ?? "#1e40af",
            carpeta_raiz_drive: data.carpeta_raiz_drive ?? "",
            carpeta_temporal_drive: data.carpeta_temporal_drive ?? "",
            permitir_registro: data.permitir_registro ?? false,
            portal_en_mantenimiento: data.portal_en_mantenimiento ?? false,
            activo: data.activo ?? true,
          });
        }
      }

      setMensaje({ tipo: "exito", texto: "Ajustes del sistema actualizados correctamente." });
    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message || "Error al guardar los cambios." });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-gray-400">Cargando parámetros del sistema...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Ajustes del Sistema
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Panel de control global para parámetros institucionales, de marca y de integración técnica.
          </p>
        </div>
        <button
          type="submit"
          form="form-ajustes"
          disabled={guardando}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 shrink-0"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-semibold ${
          mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {mensaje.tipo === "exito" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {mensaje.texto}
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setPestana("general")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            pestana === "general" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Entidad y Contacto
        </button>
        <button
          type="button"
          onClick={() => setPestana("marca")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            pestana === "marca" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Palette className="h-4 w-4" />
          Marca e Identidad Visual
        </button>
        <button
          type="button"
          onClick={() => setPestana("drive")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            pestana === "drive" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <FolderGit2 className="h-4 w-4" />
          Almacenamiento (Drive)
        </button>
        <button
          type="button"
          onClick={() => setPestana("sistema")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            pestana === "sistema" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Parámetros del Portal
        </button>
      </div>

      <form id="form-ajustes" onSubmit={handleSubmit} className="space-y-6">
        {/* PESTAÑA 1: ENTIDAD Y CONTACTO */}
        {pestana === "general" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Building2 className="h-4 w-4 text-blue-600" /> Información Institucional
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">Nombre de la Entidad *</label>
                <input
                  type="text"
                  name="nombre_entidad"
                  required
                  value={formData.nombre_entidad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Sigla / Abreviatura</label>
                <input
                  type="text"
                  name="sigla"
                  value={formData.sigla}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">NIT / Identificación</label>
                <input
                  type="text"
                  name="nit"
                  value={formData.nit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Correo Institucional</label>
                <input
                  type="email"
                  name="correo_institucional"
                  value={formData.correo_institucional}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">Dirección Física</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Departamento / Estado</label>
                <input
                  type="text"
                  name="departamento"
                  value={formData.departamento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">País</label>
                <input
                  type="text"
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Sitio Web Oficial</label>
                <input
                  type="text"
                  name="sitio_web"
                  value={formData.sitio_web}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: MARCA E IDENTIDAD VISUAL */}
        {pestana === "marca" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Palette className="h-4 w-4 text-blue-600" /> Identidad Visual y Colores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre del Portal</label>
                <input
                  type="text"
                  name="nombre_portal"
                  value={formData.nombre_portal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Versión del Portal</label>
                <input
                  type="text"
                  name="version_portal"
                  value={formData.version_portal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">URL Logo Principal</label>
                <input
                  type="text"
                  name="logo_principal"
                  value={formData.logo_principal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">URL Logo Blanco (Modo Oscuro)</label>
                <input
                  type="text"
                  name="logo_blanco"
                  value={formData.logo_blanco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">URL Favicon</label>
                <input
                  type="text"
                  name="favicon"
                  value={formData.favicon}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Color Primario (Hex)</label>
                  <input
                    type="color"
                    name="color_primario"
                    value={formData.color_primario || "#2563eb"}
                    onChange={handleChange}
                    className="w-full h-9 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Color Secundario (Hex)</label>
                  <input
                    type="color"
                    name="color_secundario"
                    value={formData.color_secundario || "#1e40af"}
                    onChange={handleChange}
                    className="w-full h-9 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: ALMACENAMIENTO DRIVE */}
        {pestana === "drive" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <FolderGit2 className="h-4 w-4 text-blue-600" /> Configuración de Directorios (Google Drive)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">ID de Carpeta Raíz en Drive</label>
                <input
                  type="text"
                  name="carpeta_raiz_drive"
                  value={formData.carpeta_raiz_drive}
                  onChange={handleChange}
                  placeholder="Ej. 1A2B3C4D5E6F..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">ID de Carpeta Temporal (Caché / Subidas)</label>
                <input
                  type="text"
                  name="carpeta_temporal_drive"
                  value={formData.carpeta_temporal_drive}
                  onChange={handleChange}
                  placeholder="Ej. 9Z8Y7X6W5V4U..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: PARÁMETROS DEL PORTAL */}
        {pestana === "sistema" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Sliders className="h-4 w-4 text-blue-600" /> Parámetros Generales y Regionales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Idioma</label>
                <select
                  name="idioma"
                  value={formData.idioma}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                >
                  <option value="es-CO">Español (Colombia - es-CO)</option>
                  <option value="es-ES">Español (España - es-ES)</option>
                  <option value="en-US">Inglés (EE.UU. - en-US)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Zona Horaria</label>
                <input
                  type="text"
                  name="zona_horaria"
                  value={formData.zona_horaria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Formato de Fecha</label>
                <input
                  type="text"
                  name="formato_fecha"
                  value={formData.formato_fecha}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="permitir_registro"
                    name="permitir_registro"
                    checked={formData.permitir_registro}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="permitir_registro" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Permitir Auto-registro de Usuarios
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portal_en_mantenimiento"
                    name="portal_en_mantenimiento"
                    checked={formData.portal_en_mantenimiento}
                    onChange={handleChange}
                    className="h-4 w-4 text-amber-600 rounded border-gray-300"
                  />
                  <label htmlFor="portal_en_mantenimiento" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Portal en Modo Mantenimiento
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleChange}
                    className="h-4 w-4 text-green-600 rounded border-gray-300"
                  />
                  <label htmlFor="activo" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Sistema Activo
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}