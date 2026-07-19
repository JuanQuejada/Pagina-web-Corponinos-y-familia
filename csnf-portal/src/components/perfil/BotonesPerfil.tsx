'use client';

import {
  Save,
  RotateCcw,
} from 'lucide-react';

interface BotonesPerfilProps {
  guardando: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
}

export default function BotonesPerfil({
  guardando,
  onGuardar,
  onCancelar,
}: BotonesPerfilProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <div className="flex justify-end gap-4">

        <button
          type="button"
          onClick={onCancelar}
          className="
            flex
            items-center
            gap-2
            px-5
            py-3
            rounded-xl
            border
            border-gray-300
            text-gray-700
            hover:bg-gray-100
            transition
          "
        >
          <RotateCcw className="w-5 h-5" />

          Cancelar
        </button>

        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="
            flex
            items-center
            gap-2
            px-5
            py-3
            rounded-xl
            bg-primary
            text-white
            hover:bg-primary/90
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition
          "
        >
          <Save className="w-5 h-5" />

          {guardando
            ? 'Guardando...'
            : 'Guardar Cambios'}
        </button>

      </div>

    </div>
  );
}