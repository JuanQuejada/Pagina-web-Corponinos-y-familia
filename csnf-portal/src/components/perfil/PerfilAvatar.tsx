"use client";

import { Camera, Trash2, Upload } from "lucide-react";
import { Usuario } from "@/types";
import {
  obtenerColorAvatar,
  obtenerIniciales,
} from "@/lib/utils";

interface PerfilAvatarProps {
  usuario: Usuario;
  fotoPreview: string | null;
  onFotoSeleccionada: (archivo: File | null) => void;
  onEliminarFoto: () => void;
}

export default function PerfilAvatar({
  usuario,
  fotoPreview,
  onFotoSeleccionada,
  onEliminarFoto,
}: PerfilAvatarProps) {
  //------------------------------------------------------
  // Nombre a mostrar (Soporte para código o string)
  //------------------------------------------------------
  const esNatural =
    usuario.tipoPersona?.codigo === "NATURAL" ||
    (usuario as any).tipo_persona === "natural";

  const nombreMostrar = esNatural
    ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() ||
      "Usuario"
    : usuario.razon_social?.trim() ||
      "Usuario";

  //------------------------------------------------------
  // Extracción segura del Nombre del Cargo
  //------------------------------------------------------
  const nombreCargo =
    typeof usuario.cargo === "object" && usuario.cargo !== null
      ? usuario.cargo.nombre
      : typeof usuario.cargo === "string"
      ? usuario.cargo
      : "Sin cargo asignado";

  //------------------------------------------------------
  // Imagen
  //------------------------------------------------------
  const imagen = fotoPreview ?? usuario.foto_url ?? null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Encabezado */}
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <div className="relative">
          {imagen ? (
            <img
              src={imagen}
              alt="Foto de perfil"
              className="h-36 w-36 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full text-4xl font-bold text-white shadow-md"
              style={{
                background: obtenerColorAvatar(usuario.id),
              }}
            >
              {obtenerIniciales(usuario)}
            </div>
          )}
        </div>

        {/* Nombre */}
        <h2 className="mt-5 text-center text-xl font-bold text-gray-900">
          {nombreMostrar}
        </h2>

        {/* Cargo (Renderizando .nombre de manera segura) */}
        <p className="mt-1 text-center text-sm text-gray-600">
          {nombreCargo}
        </p>

        {/* Área */}
        <span className="mt-2 rounded-full bg-teal-50 px-4 py-1 text-xs font-semibold text-teal-700">
          {usuario.area?.nombre ?? "Sin área asignada"}
        </span>
      </div>

      {/* Acciones */}
      <div className="mt-8 space-y-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-600 bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
          <Upload className="h-4 w-4" />
          Cambiar fotografía
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              onFotoSeleccionada(e.target.files?.[0] ?? null)
            }
          />
        </label>

        <button
          onClick={onEliminarFoto}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar fotografía
        </button>
      </div>

      {/* Información extra */}
      <div className="mt-8 border-t border-gray-200 pt-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Camera className="h-4 w-4" />
          <span>Formatos permitidos: JPG, PNG y WEBP.</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Tamaño máximo recomendado: 5 MB.
        </p>
      </div>
    </div>
  );
}