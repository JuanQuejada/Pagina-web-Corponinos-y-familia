'use client';

import { ChangeEvent } from 'react';
import {
  Camera,
  Trash2,
} from 'lucide-react';

import {
  obtenerIniciales,
  obtenerColorAvatar,
} from '@/lib/utils';

import { Usuario } from '@/types';

interface PerfilAvatarProps {
  usuario: Usuario;
  fotoPreview: string | null;
  onFotoSeleccionada: (file: File | null) => void;
  onEliminarFoto: () => void;
}

export default function PerfilAvatar({
  usuario,
  fotoPreview,
  onFotoSeleccionada,
  onEliminarFoto,
}: PerfilAvatarProps) {
  const seleccionarFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    onFotoSeleccionada(archivo);
  };

  const imagen = fotoPreview || usuario.foto_url;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Foto de Perfil
      </h2>

      <div className="flex flex-col items-center">

        {/* Avatar */}

        {imagen ? (
          <img
            src={imagen}
            alt="Foto de perfil"
            className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
          />
        ) : (
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center text-white text-5xl font-bold border-4 border-gray-200"
            style={{
              background: obtenerColorAvatar(usuario.id),
            }}
          >
            {obtenerIniciales(
              usuario.nombres,
              usuario.apellidos
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 w-full">

          {/* Cambiar Foto */}

          <label
            htmlFor="fotoPerfil"
            className="
              cursor-pointer
              flex
              items-center
              justify-center
              gap-2
              bg-primary
              hover:bg-primary/90
              text-white
              rounded-xl
              py-3
              transition
            "
          >
            <Camera className="w-5 h-5" />

            Cambiar Foto
          </label>

          <input
            id="fotoPerfil"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={seleccionarFoto}
          />

          {/* Eliminar */}

          {imagen && (
            <button
              type="button"
              onClick={onEliminarFoto}
              className="
                flex
                items-center
                justify-center
                gap-2
                border
                border-red-300
                text-red-600
                hover:bg-red-50
                rounded-xl
                py-3
                transition
              "
            >
              <Trash2 className="w-5 h-5" />

              Eliminar Foto
            </button>
          )}

        </div>

        <p className="mt-5 text-sm text-center text-gray-500 leading-relaxed">
          Formatos permitidos:
          <br />
          JPG, PNG o WEBP
          <br />
          Tamaño máximo: 2 MB.
        </p>

      </div>

    </div>
  );
}