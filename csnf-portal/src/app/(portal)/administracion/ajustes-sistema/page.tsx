"use client";

import { useCallback, useEffect, useState } from "react";
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
  Monitor,
  Phone,
  ShieldCheck,
  Globe2,
  ServerCog,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pestana =
  | "general"
  | "apariencia"
  | "encabezado"
  | "drive"
  | "sistema"
  | "administracion";

interface ConfiguracionGeneral {
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
  color_acento: string;
  color_exito: string;
  color_advertencia: string;
  color_error: string;
  color_info: string;
  tema: string;

  subtitulo_portal: string;
  encabezado_fuente: string;
  encabezado_tamano: string;
  encabezado_estilo: string;
  encabezado_color: string;

  carpeta_raiz_drive: string;
  carpeta_temporal_drive: string;

  permitir_registro: boolean;
  portal_en_mantenimiento: boolean;
  activo: boolean;

  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const CONFIGURACION_INICIAL: ConfiguracionGeneral = {
  id: "",

  nombre_entidad: "",
  sigla: "",
  nit: "",
  direccion: "",
  ciudad: "",
  departamento: "",
  pais: "Colombia",
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

  color_primario: "#2563EB",
  color_secundario: "#1E40AF",
  color_acento: "#7C3AED",
  color_exito: "#16A34A",
  color_advertencia: "#D97706",
  color_error: "#DC2626",
  color_info: "#0284C7",

  tema: "sistema",

  subtitulo_portal: "",
  encabezado_fuente: "Inter",
  encabezado_tamano: "text-xl",
  encabezado_estilo: "font-bold",
  encabezado_color: "#2563EB",

  carpeta_raiz_drive: "",
  carpeta_temporal_drive: "",

  permitir_registro: false,
  portal_en_mantenimiento: false,
  activo: true,

  created_by: null,
  updated_by: null,
  created_at: null,
  updated_at: null,
};

function obtenerConfiguracionNormalizada(
  data: unknown
): ConfiguracionGeneral {
  const d = (data ?? {}) as Record<string, unknown>;

  const texto = (
    campo: keyof ConfiguracionGeneral,
    valorPorDefecto = ""
  ): string => {
    const valor = d[campo];

    return typeof valor === "string"
      ? valor
      : valorPorDefecto;
  };

  const booleano = (
    campo: keyof ConfiguracionGeneral,
    valorPorDefecto: boolean
  ): boolean => {
    const valor = d[campo];

    return typeof valor === "boolean"
      ? valor
      : valorPorDefecto;
  };

  const nullable = (
    campo: keyof ConfiguracionGeneral
  ): string | null => {
    const valor = d[campo];

    return typeof valor === "string"
      ? valor
      : null;
  };

  return {
    ...CONFIGURACION_INICIAL,

    id: texto("id"),

    nombre_entidad: texto("nombre_entidad"),
    sigla: texto("sigla"),
    nit: texto("nit"),
    direccion: texto("direccion"),
    ciudad: texto("ciudad"),
    departamento: texto("departamento"),
    pais: texto("pais", "Colombia"),
    telefono: texto("telefono"),
    correo_institucional: texto(
      "correo_institucional"
    ),
    sitio_web: texto("sitio_web"),

    nombre_portal: texto("nombre_portal"),
    version_portal: texto(
      "version_portal",
      "1.0.0"
    ),

    idioma: texto("idioma", "es-CO"),
    zona_horaria: texto(
      "zona_horaria",
      "America/Bogota"
    ),
    formato_fecha: texto(
      "formato_fecha",
      "DD/MM/YYYY"
    ),

    logo_principal: texto("logo_principal"),
    logo_blanco: texto("logo_blanco"),
    favicon: texto("favicon"),

    color_primario: texto(
      "color_primario",
      "#2563EB"
    ),
    color_secundario: texto(
      "color_secundario",
      "#1E40AF"
    ),
    color_acento: texto(
      "color_acento",
      "#7C3AED"
    ),
    color_exito: texto(
      "color_exito",
      "#16A34A"
    ),
    color_advertencia: texto(
      "color_advertencia",
      "#D97706"
    ),
    color_error: texto(
      "color_error",
      "#DC2626"
    ),
    color_info: texto(
      "color_info",
      "#0284C7"
    ),

    tema: texto("tema", "sistema"),

    subtitulo_portal: texto(
      "subtitulo_portal"
    ),
    encabezado_fuente: texto(
      "encabezado_fuente",
      "Inter"
    ),
    encabezado_tamano: texto(
      "encabezado_tamano",
      "text-xl"
    ),
    encabezado_estilo: texto(
      "encabezado_estilo",
      "font-bold"
    ),
    encabezado_color: texto(
      "encabezado_color",
      "#2563EB"
    ),

    carpeta_raiz_drive: texto(
      "carpeta_raiz_drive"
    ),
    carpeta_temporal_drive: texto(
      "carpeta_temporal_drive"
    ),

    permitir_registro: booleano(
      "permitir_registro",
      false
    ),
    portal_en_mantenimiento: booleano(
      "portal_en_mantenimiento",
      false
    ),
    activo: booleano(
      "activo",
      true
    ),

    created_by: nullable("created_by"),
    updated_by: nullable("updated_by"),
    created_at: nullable("created_at"),
    updated_at: nullable("updated_at"),
  };
}

async function leerRespuesta(
  response: Response
): Promise<Record<string, unknown>> {
  const texto = await response.text();

  if (!texto.trim()) {
    return {};
  }

  try {
    return JSON.parse(texto) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      response.ok
        ? "El servidor devolvió una respuesta no válida."
        : `El servidor respondió con ${response.status} ${response.statusText}.`
    );
  }
}

function CampoTexto({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
        {label}

        {required && (
          <span className="text-red-500 ml-1">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
      />
    </div>
  );
}

function CampoColor({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  const colorValido =
    /^#[0-9A-Fa-f]{6}$/.test(value);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={
            colorValido
              ? value
              : "#000000"
          }
          onChange={onChange}
          className="h-10 w-14 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
        />

        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          className="flex-1 px-3 py-2.5 text-xs font-mono uppercase bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function Interruptor({
  label,
  descripcion,
  name,
  checked,
  onChange,
}: {
  label: string;
  descripcion?: string;
  name: string;
  checked: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 cursor-pointer hover:border-blue-200 dark:hover:border-slate-700 transition">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300"
      />

      <span>
        <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">
          {label}
        </span>

        {descripcion && (
          <span className="block text-[11px] text-gray-500 dark:text-slate-400 mt-1">
            {descripcion}
          </span>
        )}
      </span>
    </label>
  );
}

const CARD_CLASS =
  "bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-5";

const INPUT_CLASS =
  "w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none";

export default function ModuloAjustesPage() {
  const [pestana, setPestana] =
    useState<Pestana>("general");

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  const [formData, setFormData] =
    useState<ConfiguracionGeneral>(
      CONFIGURACION_INICIAL
    );

  const cargarConfiguracion =
    useCallback(async () => {
      setCargando(true);
      setMensaje(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(
            "No existe una sesión autenticada."
          );
        }

        const response = await fetch(
          "/api/configuracion-general",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const resultado =
          await leerRespuesta(response);

        if (!response.ok) {
          throw new Error(
            String(
              resultado.error ||
                "No fue posible cargar la configuración."
            )
          );
        }

        if (resultado.configuracion) {
          setFormData(
            obtenerConfiguracionNormalizada(
              resultado.configuracion
            )
          );
        } else {
          setFormData(
            CONFIGURACION_INICIAL
          );
        }
      } catch (error) {
        console.error(
          "Error cargando configuración:",
          error
        );

        setMensaje({
          tipo: "error",
          texto:
            error instanceof Error
              ? error.message
              : "No fue posible cargar la configuración general.",
        });
      } finally {
        setCargando(false);
      }
    }, []);

  useEffect(() => {
    void cargarConfiguracion();
  }, [cargarConfiguracion]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = e.target;

    setFormData((prev) => ({
      ...prev,

      [name]:
        type === "checkbox"
          ? (
              e.target as HTMLInputElement
            ).checked
          : value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (guardando) {
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "La sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const payload = {
        nombre_entidad:
          formData.nombre_entidad,

        sigla: formData.sigla,

        nit: formData.nit,

        direccion:
          formData.direccion,

        ciudad:
          formData.ciudad,

        departamento:
          formData.departamento,

        pais:
          formData.pais,

        telefono:
          formData.telefono,

        correo_institucional:
          formData.correo_institucional,

        sitio_web:
          formData.sitio_web,

        nombre_portal:
          formData.nombre_portal,

        version_portal:
          formData.version_portal,

        idioma:
          formData.idioma,

        zona_horaria:
          formData.zona_horaria,

        formato_fecha:
          formData.formato_fecha,

        logo_principal:
          formData.logo_principal,

        logo_blanco:
          formData.logo_blanco,

        favicon:
          formData.favicon,

        color_primario:
          formData.color_primario,

        color_secundario:
          formData.color_secundario,

        color_acento:
          formData.color_acento,

        color_exito:
          formData.color_exito,

        color_advertencia:
          formData.color_advertencia,

        color_error:
          formData.color_error,

        color_info:
          formData.color_info,

        tema:
          formData.tema,

        subtitulo_portal:
          formData.subtitulo_portal,

        encabezado_fuente:
          formData.encabezado_fuente,

        encabezado_tamano:
          formData.encabezado_tamano,

        encabezado_estilo:
          formData.encabezado_estilo,

        encabezado_color:
          formData.encabezado_color,

        carpeta_raiz_drive:
          formData.carpeta_raiz_drive,

        carpeta_temporal_drive:
          formData.carpeta_temporal_drive,

        permitir_registro:
          formData.permitir_registro,

        portal_en_mantenimiento:
          formData.portal_en_mantenimiento,

        activo:
          formData.activo,
      };

      const response = await fetch(
        "/api/configuracion-general",
        {
          method: formData.id
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      const resultado =
        await leerRespuesta(response);

      if (!response.ok) {
        throw new Error(
          String(
            resultado.error ||
              resultado.detalle ||
              "No fue posible guardar los cambios."
          )
        );
      }

      if (resultado.configuracion) {
        setFormData(
          obtenerConfiguracionNormalizada(
            resultado.configuracion
          )
        );
      }

      setMensaje({
        tipo: "exito",
        texto: String(
          resultado.mensaje ||
            "Configuración general actualizada correctamente."
        ),
      });
    } catch (error) {
      console.error(
        "Error guardando configuración:",
        error
      );

      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "Error al guardar los cambios.",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

        <p className="text-xs text-gray-400">
          Cargando parámetros del sistema...
        </p>
      </div>
    );
  }

  const tabs: Array<
    [
      Pestana,
      string,
      typeof Building2
    ]
  > = [
    [
      "general",
      "Institución",
      Building2,
    ],
    [
      "apariencia",
      "Apariencia",
      Palette,
    ],
    [
      "encabezado",
      "Encabezado",
      Monitor,
    ],
    [
      "drive",
      "Almacenamiento",
      FolderGit2,
    ],
    [
      "sistema",
      "Comportamiento",
      Sliders,
    ],
    [
      "administracion",
      "Administración",
      ShieldCheck,
    ],
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />

            Ajustes del Sistema
          </h1>

          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Centro de configuración general
            del portal, identidad institucional,
            apariencia, comportamiento e
            integraciones.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              void cargarConfiguracion()
            }
            disabled={guardando}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />

            Recargar
          </button>

          <button
            type="submit"
            form="form-ajustes"
            disabled={guardando}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 shrink-0"
          >
            {guardando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {guardando
              ? "Guardando..."
              : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            mensaje.tipo === "exito"
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
          }`}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}

          {mensaje.texto}
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 overflow-x-auto">
        {tabs.map(
          ([
            key,
            label,
            Icon,
          ]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setPestana(key)
              }
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                pestana === key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-4 w-4" />

              {label}
            </button>
          )
        )}
      </div>

      <form
        id="form-ajustes"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {pestana === "general" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Building2 className="h-4 w-4 text-blue-600" />

                Identidad institucional
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CampoTexto
                  label="Nombre de la entidad"
                  name="nombre_entidad"
                  value={
                    formData.nombre_entidad
                  }
                  onChange={handleChange}
                  required
                  className="md:col-span-2"
                />

                <CampoTexto
                  label="Sigla / Abreviatura"
                  name="sigla"
                  value={formData.sigla}
                  onChange={handleChange}
                />

                <CampoTexto
                  label="NIT / Identificación"
                  name="nit"
                  value={formData.nit}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Phone className="h-4 w-4 text-blue-600" />

                Información institucional
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CampoTexto
                  label="Dirección"
                  name="direccion"
                  value={
                    formData.direccion
                  }
                  onChange={handleChange}
                  className="md:col-span-2"
                />

                <CampoTexto
                  label="Ciudad"
                  name="ciudad"
                  value={
                    formData.ciudad
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Departamento / Estado"
                  name="departamento"
                  value={
                    formData.departamento
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="País"
                  name="pais"
                  value={
                    formData.pais
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Teléfono"
                  name="telefono"
                  value={
                    formData.telefono
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Correo institucional"
                  name="correo_institucional"
                  type="email"
                  value={
                    formData.correo_institucional
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Sitio web oficial"
                  name="sitio_web"
                  value={
                    formData.sitio_web
                  }
                  onChange={handleChange}
                  className="md:col-span-3"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <ServerCog className="h-4 w-4 text-blue-600" />

                Identificación del portal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  label="Nombre del portal"
                  name="nombre_portal"
                  value={
                    formData.nombre_portal
                  }
                  onChange={handleChange}
                  required
                />

                <CampoTexto
                  label="Versión del portal"
                  name="version_portal"
                  value={
                    formData.version_portal
                  }
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        {pestana === "apariencia" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Palette className="h-4 w-4 text-blue-600" />

                Paleta principal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CampoColor
                  label="Color primario"
                  name="color_primario"
                  value={
                    formData.color_primario
                  }
                  onChange={handleChange}
                />

                <CampoColor
                  label="Color secundario"
                  name="color_secundario"
                  value={
                    formData.color_secundario
                  }
                  onChange={handleChange}
                />

                <CampoColor
                  label="Color de acento"
                  name="color_acento"
                  value={
                    formData.color_acento
                  }
                  onChange={handleChange}
                />

                <CampoColor
                  label="Color de información"
                  name="color_info"
                  value={
                    formData.color_info
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-slate-800">
                Colores de estados
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CampoColor
                  label="Éxito"
                  name="color_exito"
                  value={
                    formData.color_exito
                  }
                  onChange={handleChange}
                />

                <CampoColor
                  label="Advertencia"
                  name="color_advertencia"
                  value={
                    formData.color_advertencia
                  }
                  onChange={handleChange}
                />

                <CampoColor
                  label="Error"
                  name="color_error"
                  value={
                    formData.color_error
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                Tema de la interfaz
              </h2>

              <select
                name="tema"
                value={formData.tema}
                onChange={handleChange}
                className={`${INPUT_CLASS} md:w-1/2`}
              >
                <option value="sistema">
                  Usar configuración del sistema
                </option>

                <option value="claro">
                  Tema claro
                </option>

                <option value="oscuro">
                  Tema oscuro
                </option>
              </select>
            </div>
          </div>
        )}

        {pestana === "encabezado" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Monitor className="h-4 w-4 text-blue-600" />

                Configuración del encabezado
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  label="Nombre mostrado"
                  name="nombre_portal"
                  value={
                    formData.nombre_portal
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Subtítulo"
                  name="subtitulo_portal"
                  value={
                    formData.subtitulo_portal
                  }
                  onChange={handleChange}
                  placeholder="Descripción breve del portal"
                />

                <CampoTexto
                  label="Familia de fuente"
                  name="encabezado_fuente"
                  value={
                    formData.encabezado_fuente
                  }
                  onChange={handleChange}
                  placeholder="Inter"
                />

                <CampoTexto
                  label="Tamaño de fuente"
                  name="encabezado_tamano"
                  value={
                    formData.encabezado_tamano
                  }
                  onChange={handleChange}
                  placeholder="text-xl"
                />

                <CampoTexto
                  label="Estilo de fuente"
                  name="encabezado_estilo"
                  value={
                    formData.encabezado_estilo
                  }
                  onChange={handleChange}
                  placeholder="font-bold"
                />

                <CampoColor
                  label="Color del encabezado"
                  name="encabezado_color"
                  value={
                    formData.encabezado_color
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-slate-800">
                Identidad visual
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <CampoTexto
                  label="URL del logo principal"
                  name="logo_principal"
                  value={
                    formData.logo_principal
                  }
                  onChange={handleChange}
                  placeholder="URL o ruta del recurso"
                />

                <CampoTexto
                  label="URL del logo blanco"
                  name="logo_blanco"
                  value={
                    formData.logo_blanco
                  }
                  onChange={handleChange}
                  placeholder="URL o ruta del recurso"
                />

                <CampoTexto
                  label="URL del favicon"
                  name="favicon"
                  value={
                    formData.favicon
                  }
                  onChange={handleChange}
                  placeholder="URL o ruta del recurso"
                />
              </div>
            </div>
          </div>
        )}

        {pestana === "drive" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <FolderGit2 className="h-4 w-4 text-blue-600" />

                Google Drive
              </h2>

              <p className="text-xs text-gray-500 dark:text-slate-400">
                Estos identificadores permiten
                definir las carpetas utilizadas
                por las integraciones de
                almacenamiento del portal.
              </p>

              <CampoTexto
                label="ID de carpeta raíz"
                name="carpeta_raiz_drive"
                value={
                  formData.carpeta_raiz_drive
                }
                onChange={handleChange}
                placeholder="Ej. 0AGbj-ZUi-DPVUk9PVA"
              />

              <CampoTexto
                label="ID de carpeta temporal"
                name="carpeta_temporal_drive"
                value={
                  formData.carpeta_temporal_drive
                }
                onChange={handleChange}
                placeholder="ID de carpeta temporal"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-5">
              <div className="flex gap-3">
                <Globe2 className="h-5 w-5 text-blue-600 shrink-0" />

                <div>
                  <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300">
                    Integración de almacenamiento
                  </h3>

                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                    Los identificadores almacenados
                    aquí serán utilizados por las
                    APIs del sistema que trabajan
                    con Google Drive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {pestana === "sistema" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Globe2 className="h-4 w-4 text-blue-600" />

                Configuración regional
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Idioma
                  </label>

                  <select
                    name="idioma"
                    value={formData.idioma}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                  >
                    <option value="es-CO">
                      Español — Colombia
                    </option>

                    <option value="es-ES">
                      Español — España
                    </option>

                    <option value="en-US">
                      English — Estados Unidos
                    </option>
                  </select>
                </div>

                <CampoTexto
                  label="Zona horaria"
                  name="zona_horaria"
                  value={
                    formData.zona_horaria
                  }
                  onChange={handleChange}
                />

                <CampoTexto
                  label="Formato de fecha"
                  name="formato_fecha"
                  value={
                    formData.formato_fecha
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <Sliders className="h-4 w-4 text-blue-600" />

                Comportamiento del portal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Interruptor
                  label="Permitir auto-registro"
                  descripcion="Permite que nuevos usuarios puedan registrarse en el portal."
                  name="permitir_registro"
                  checked={
                    formData.permitir_registro
                  }
                  onChange={handleChange}
                />

                <Interruptor
                  label="Portal en mantenimiento"
                  descripcion="Activa el modo mantenimiento para limitar el acceso operativo."
                  name="portal_en_mantenimiento"
                  checked={
                    formData.portal_en_mantenimiento
                  }
                  onChange={handleChange}
                />

                <Interruptor
                  label="Sistema activo"
                  descripcion="Indica que la configuración general del sistema se encuentra activa."
                  name="activo"
                  checked={
                    formData.activo
                  }
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        {pestana === "administracion" && (
          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                <ShieldCheck className="h-4 w-4 text-blue-600" />

                Auditoría y control
              </h2>

              <p className="text-xs text-gray-500 dark:text-slate-400">
                Esta información es administrada
                por el servidor y permite conocer
                el historial básico de creación y
                actualización de la configuración.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    ID configuración
                  </p>

                  <p className="text-xs font-mono text-gray-700 dark:text-slate-300 mt-1 break-all">
                    {formData.id ||
                      "Sin registrar"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Creado por
                  </p>

                  <p className="text-xs font-mono text-gray-700 dark:text-slate-300 mt-1 break-all">
                    {formData.created_by ||
                      "No disponible"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Fecha de creación
                  </p>

                  <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                    {formData.created_at
                      ? new Date(
                          formData.created_at
                        ).toLocaleString(
                          "es-CO"
                        )
                      : "No disponible"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Última actualización
                  </p>

                  <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                    {formData.updated_at
                      ? new Date(
                          formData.updated_at
                        ).toLocaleString(
                          "es-CO"
                        )
                      : "No disponible"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Actualizado por
                  </p>

                  <p className="text-xs font-mono text-gray-700 dark:text-slate-300 mt-1 break-all">
                    {formData.updated_by ||
                      "No disponible"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />

                <div>
                  <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Control administrativo
                  </h3>

                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Los campos de auditoría no
                    pueden ser modificados desde
                    este formulario. El servidor
                    establece automáticamente
                    quién realiza cada modificación
                    y cuándo se realiza.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}