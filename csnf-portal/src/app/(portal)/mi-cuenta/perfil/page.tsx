"use client";

import { useState } from "react";
import {
  Upload,
  Trash2,
  Camera,
  AlertCircle,
  User,
  Building,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function PerfilPage() {
  const { usuarioPortal, actualizarSesion } = useAuth();
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorPeso, setErrorPeso] = useState<string | null>(null);

  // Extraer objeto de usuario y la primera asignación activa del arreglo
  const usuario = usuarioPortal?.usuario;
  const listaAsignaciones = usuarioPortal?.asignaciones;
  
  // Tomamos la primera asignación si existe en el arreglo
  const asignacion = Array.isArray(listaAsignaciones) && listaAsignaciones.length > 0 
    ? listaAsignaciones[0] 
    : null;

  // ---------------------------------------------------------------------------
  // FORMATO Y LECTURA DE CAMPOS DESDE SUPABASE
  // ---------------------------------------------------------------------------

  // 1. Tipo de Persona
  const tipoPersonaObj = usuario?.tipo_persona_id;
  const esPersonaNatural =
    (typeof tipoPersonaObj === "object" && tipoPersonaObj !== null
      ? (tipoPersonaObj as any)?.codigo
      : tipoPersonaObj
    )
      ?.toString()
      .toLowerCase() === "natural";

  const tipoPersonaMostrar =
    typeof tipoPersonaObj === "object" && tipoPersonaObj !== null
      ? (tipoPersonaObj as any).nombre ?? (tipoPersonaObj as any).codigo
      : (tipoPersonaObj ?? "Persona");

  // 2. Tipo de Identificación
  const tipoIdentificacionObj = usuario?.tipo_identificacion_id;
  const tipoDocumentoMostrar =
    typeof tipoIdentificacionObj === "object" && tipoIdentificacionObj !== null
      ? (tipoIdentificacionObj as any).nombre ?? (tipoIdentificacionObj as any).codigo ?? (tipoIdentificacionObj as any).sigla
      : (tipoIdentificacionObj ?? "Documento de Identidad");

  // 3. Número de Identificación (Basado en la columna real 'numero_identificacion')
  const numeroDocumentoMostrar = usuario?.numero_identificacion ?? "No registrado";

  // 4. Nombre / Razón Social (Basado en 'nombres', 'apellidos' y 'razon_social')
  const nombreMostrar = usuario
    ? esPersonaNatural
      ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim()
      : (usuario.razon_social ?? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() ?? "Sin nombre")
    : "Sin usuario";

  // 5. Información Institucional corregida para evitar errores de tipo ID vs Objeto
  const cargoMostrar =
    typeof asignacion?.cargo_id === "object" && asignacion?.cargo_id !== null
      ? (asignacion.cargo_id as any).nombre
      : (asignacion?.cargo_id ? `Cargo ID: ${asignacion.cargo_id}` : "No asignado");

  const departamentoMostrar =
    typeof asignacion?.cargo_id === "object" && (asignacion?.cargo_id as any)?.departamento !== null
      ? (asignacion.cargo_id as any)?.departamento?.nombre
      : "Departamento General";

  const rolMostrar =
    typeof asignacion?.rol_id === "object" && asignacion?.rol_id !== null
      ? (asignacion.rol_id as any).nombre
      : (asignacion?.rol_id ? `Rol ID: ${asignacion.rol_id}` : "Rol institucional");

  const fotoUrl = usuario?.foto_url;

  // Estados locales para los campos editables de la tabla 'usuarios'
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [direccion, setDireccion] = useState(usuario?.direccion ?? "");

  // ---------------------------------------------------------------------------
  // MANEJADOR: CAMBIAR FOTOGRAFÍA (VALIDACIÓN ESTRICTA < 300 KB)
  // ---------------------------------------------------------------------------
  const manejarSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorPeso(null);
    const file = e.target.files?.[0];
    if (!file || !usuario?.id) return;

    // Límite estricto de 300 KB (300 * 1024 bytes)
    const MAX_SIZE_BYTES = 300 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      const pesoKB = (file.size / 1024).toFixed(1);
      setErrorPeso(
        `El archivo pesa ${pesoKB} KB. El tamaño máximo permitido es de 300 KB.`
      );
      e.target.value = "";
      return;
    }

    try {
      setSubiendo(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `avatars/avatar_${usuario.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("perfiles")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("perfiles")
        .getPublicUrl(fileName);

      const nuevaFotoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ foto_url: nuevaFotoUrl, updated_at: new Date().toISOString() })
        .eq("id", usuario.id);

      if (updateError) throw updateError;

      if (actualizarSesion) {
        await actualizarSesion();
      }

      alert("¡Fotografía de perfil actualizada con éxito!");
    } catch (err: any) {
      alert("Error al subir la imagen: " + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MANEJADOR: ELIMINAR FOTOGRAFÍA
  // ---------------------------------------------------------------------------
  const manejarEliminarFoto = async () => {
    if (!usuario?.id) return;
    if (!confirm("¿Está seguro de que desea eliminar su fotografía de perfil?")) return;

    try {
      setSubiendo(true);

      const { error } = await supabase
        .from("usuarios")
        .update({ foto_url: null, updated_at: new Date().toISOString() })
        .eq("id", usuario.id);

      if (error) throw error;

      if (actualizarSesion) {
        await actualizarSesion();
      }

      alert("Fotografía eliminada correctamente.");
    } catch (err: any) {
      alert("Error al eliminar fotografía: " + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MANEJADOR: GUARDAR DATOS DEL PERFIL
  // ---------------------------------------------------------------------------
  const manejarGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario?.id) return;

    try {
      setGuardando(true);

      const { error } = await supabase
        .from("usuarios")
        .update({
          telefono,
          direccion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usuario.id);

      if (error) throw error;

      if (actualizarSesion) {
        await actualizarSesion();
      }

      alert("¡Perfil actualizado con éxito!");
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ENCABEZADO */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500">
          Consulte y actualice la información de su cuenta institucional.
        </p>
      </div>

      {/* DISPOSICIÓN EN GRID DE 2 COLUMNAS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* COLUMNA 1: TARJETA DE FOTOGRAFÍA Y ROL */}
        <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-md bg-gradient-to-br from-emerald-600 to-teal-800">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={String(nombreMostrar)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-extrabold text-white">
                {String(nombreMostrar).charAt(0)}
              </span>
            )}
          </div>

          <h2 className="text-base font-bold uppercase tracking-tight text-slate-800">
            {String(nombreMostrar)}
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            {String(cargoMostrar)}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {String(departamentoMostrar)}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {String(rolMostrar)}
            </span>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2.5">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {subiendo ? "Subiendo..." : "Cambiar fotografía"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={manejarSubirFoto}
                disabled={subiendo}
                className="hidden"
              />
            </label>

            {fotoUrl && (
              <button
                onClick={manejarEliminarFoto}
                disabled={subiendo}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar fotografía
              </button>
            )}
          </div>

          {errorPeso && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-left text-xs text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorPeso}</span>
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-left w-full">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Camera className="h-3.5 w-3.5" /> Formatos permitidos: JPG, PNG y WEBP.
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Tamaño máximo recomendado: <strong>300 KB</strong>.
            </p>
          </div>
        </div>

        {/* COLUMNA 2 Y 3: FORMULARIOS DETALLADOS */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* SECCIÓN 1: INFORMACIÓN PERSONAL COMPLETA */}
          <form
            onSubmit={manejarGuardarPerfil}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-gray-900">
                Información Personal
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* TIPO DE PERSONA (NO EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Tipo de Persona
                </label>
                <input
                  type="text"
                  disabled
                  value={String(tipoPersonaMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* TIPO DE IDENTIFICACIÓN (NO EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Tipo de Identificación
                </label>
                <input
                  type="text"
                  disabled
                  value={String(tipoDocumentoMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* NÚMERO DE IDENTIFICACIÓN (NO EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Número de Identificación
                </label>
                <input
                  type="text"
                  disabled
                  value={String(numeroDocumentoMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-slate-800 cursor-not-allowed"
                />
              </div>

              {/* NOMBRES Y APELLIDOS / RAZÓN SOCIAL (NO EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Nombres y Apellidos / Razón Social
                </label>
                <input
                  type="text"
                  disabled
                  value={String(nombreMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* CORREO ELECTRÓNICO (NO EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  disabled
                  value={usuario?.email ?? "Sin correo"}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* TELÉFONO DE CONTACTO (EDITABLE) */}
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* DIRECCIÓN (EDITABLE) */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Calle 10 # 20 - 30"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>

          {/* SECCIÓN 2: INFORMACIÓN INSTITUCIONAL */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-gray-900">
                Información Institucional
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700">Cargo</label>
                <input
                  type="text"
                  disabled
                  value={String(cargoMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Departamento</label>
                <input
                  type="text"
                  disabled
                  value={String(departamentoMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Rol asignado</label>
                <input
                  type="text"
                  disabled
                  value={String(rolMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}