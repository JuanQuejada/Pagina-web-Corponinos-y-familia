"use client";

import { useState, useEffect } from "react";
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

  // 1. Extraer correctamente el objeto usuario y asignaciones del contexto unificado
  const usuario = (usuarioPortal as any)?.usuario ?? usuarioPortal;
  const listaAsignaciones = (usuarioPortal as any)?.asignaciones ?? [];
  const asignacion = Array.isArray(listaAsignaciones) && listaAsignaciones.length > 0 
    ? listaAsignaciones[0] 
    : null;

  // Estados locales para los nombres institucionales reales resueltos por base de datos
  const [cargoMostrar, setCargoMostrar] = useState("Cargando cargo...");
  const [departamentoMostrar, setDepartamentoMostrar] = useState("Cargando departamento...");
  const [areaMostrar, setAreaMostrar] = useState("Cargando área...");
  const [rolMostrar, setRolMostrar] = useState("Cargando rol...");

  // Estados locales de datos personales
  const [tipoPersonaMostrar, setTipoPersonaMostrar] = useState("Persona Natural");
  const [tipoDocumentoMostrar, setTipoDocumentoMostrar] = useState("Cédula de Ciudadanía");

  const numeroDocumentoMostrar = usuario?.numero_identificacion ?? "No registrado";
  const nombreMostrar = usuario?.nombreCompleto || usuario?.razon_social || "Sin nombre";
   "Sin usuario";

  const fotoUrl = usuario?.foto_url;

  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  // Sincronizar inputs locales cuando cambie el usuario
  useEffect(() => {
    if (usuario) {
      setTelefono(usuario.telefono ?? "");
      setDireccion(usuario.direccion ?? "");
    }
  }, [usuario]);

  // ---------------------------------------------------------------------------
  // EFECTO: RESOLVER NOMBRES DESDE LOS UUIDS PLANOS EN SUPABASE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function resolverRelaciones() {
      if (!usuario) return;

      try {
        // 1. Resolver Tipo de Persona si es un ID
        const tipoPersonaId = usuario.tipo_persona_id;
        if (tipoPersonaId) {
          if (typeof tipoPersonaId === "object" && tipoPersonaId !== null) {
            setTipoPersonaMostrar((tipoPersonaId as any).nombre ?? "Persona Natural");
          } else {
            // Consultar tabla si es un UUID
            const { data } = await supabase.from("tipos_persona").select("nombre").eq("id", tipoPersonaId).single();
            if (data?.nombre) setTipoPersonaMostrar(data.nombre);
          }
        }

        // 2. Resolver Tipo de Identificación si es un ID
        const tipoIdVal = usuario.tipo_identificacion_id;
        if (tipoIdVal) {
          if (typeof tipoIdVal === "object" && tipoIdVal !== null) {
            setTipoDocumentoMostrar((tipoIdVal as any).nombre ?? (tipoIdVal as any).sigla ?? "Documento de Identidad");
          } else {
            const { data } = await supabase.from("tipos_identificacion").select("nombre").eq("id", tipoIdVal).single();
            if (data?.nombre) setTipoDocumentoMostrar(data.nombre);
          }
        }

        // 3. Resolver Información Institucional (Cargo, Departamento, Área, Rol)
        if (asignacion) {
          const cargoId = typeof asignacion.cargo_id === "object" && asignacion.cargo_id !== null 
            ? (asignacion.cargo_id as any).id 
            : asignacion.cargo_id;

          if (cargoId) {
            const { data: cargoData } = await supabase
              .from("cargos")
              .select(`
                nombre,
                departamento:departamentos (
                  nombre,
                  area:areas (
                    nombre
                  )
                )
              `)
              .eq("id", cargoId)
              .single();

            if (cargoData) {
              setCargoMostrar(cargoData.nombre ?? "Cargo Institucional");
              const depto: any = cargoData.departamento;
              if (depto) {
                setDepartamentoMostrar(depto.nombre ?? "Departamento General");
                const area: any = depto.area;
                if (area) {
                  setAreaMostrar(area.nombre ?? "Área Administrativa");
                }
              }
            }
          }

          const rolId = typeof asignacion.rol_id === "object" && asignacion.rol_id !== null 
            ? (asignacion.rol_id as any).id 
            : asignacion.rol_id;

          if (rolId) {
            const { data: rolData } = await supabase
              .from("roles")
              .select("nombre")
              .eq("id", rolId)
              .single();

            if (rolData?.nombre) {
              setRolMostrar(rolData.nombre);
            }
          }
        } else {
          setCargoMostrar("Sin asignación");
          setDepartamentoMostrar("Sin departamento");
          setAreaMostrar("Sin área");
          setRolMostrar("Sin rol");
        }
      } catch (err) {
        console.error("Error resolviendo nombres relacionados:", err);
      }
    }

    resolverRelaciones();
  }, [usuario, asignacion]);

  // ---------------------------------------------------------------------------
  // MANEJADOR: CAMBIAR FOTOGRAFÍA
  // ---------------------------------------------------------------------------
  const manejarSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorPeso(null);
    const file = e.target.files?.[0];
    if (!file || !usuario?.id) return;

    const MAX_SIZE_BYTES = 300 * 1024; // 300 KB
    if (file.size > MAX_SIZE_BYTES) {
      const pesoKB = (file.size / 1024).toFixed(1);
      setErrorPeso(`El archivo pesa ${pesoKB} KB. El tamaño máximo permitido es de 300 KB.`);
      e.target.value = "";
      return;
    }

    try {
      setSubiendo(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `avatars/avatar_${usuario.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const nuevaFotoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ foto_url: nuevaFotoUrl, updated_at: new Date().toISOString() })
        .eq("id", usuario.id);

      if (updateError) throw updateError;
      if (actualizarSesion) await actualizarSesion();

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
      if (actualizarSesion) await actualizarSesion();

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
      if (actualizarSesion) await actualizarSesion();

      alert("¡Perfil actualizado con éxito!");
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500">
          Consulte y actualice la información de su cuenta institucional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* COLUMNA 1: FOTOGRAFÍA Y DATOS RÁPIDOS */}
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
            {cargoMostrar}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {departamentoMostrar}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {rolMostrar}
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

        {/* COLUMNA 2 Y 3: FORMULARIOS */}
        <div className="space-y-6 lg:col-span-2">
          
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
              <div>
                <label className="text-xs font-semibold text-gray-700">Tipo de Persona</label>
                <input
                  type="text"
                  disabled
                  value={tipoPersonaMostrar}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Tipo de Identificación</label>
                <input
                  type="text"
                  disabled
                  value={tipoDocumentoMostrar}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Número de Identificación</label>
                <input
                  type="text"
                  disabled
                  value={String(numeroDocumentoMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-slate-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Nombres y Apellidos / Razón Social</label>
                <input
                  type="text"
                  disabled
                  value={String(nombreMostrar)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Correo Electrónico</label>
                <input
                  type="email"
                  disabled
                  value={usuario?.email ?? "Sin correo"}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700">Dirección</label>
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

          {/* INFORMACIÓN INSTITUCIONAL */}
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
                  value={cargoMostrar}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Departamento</label>
                <input
                  type="text"
                  disabled
                  value={departamentoMostrar}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Área</label>
                <input
                  type="text"
                  disabled
                  value={areaMostrar}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Rol asignado</label>
                <input
                  type="text"
                  disabled
                  value={rolMostrar}
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