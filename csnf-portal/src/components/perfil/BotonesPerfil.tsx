"use client";

import { Loader2, Save, RotateCcw } from "lucide-react";

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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        {/* Texto informativo */}

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Guardar cambios
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Los cambios realizados en el perfil serán visibles inmediatamente
            después de guardarlos.
          </p>
        </div>

        {/* Botones */}

        <div className="flex flex-wrap items-center gap-3">

          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              border
              border-gray-300
              bg-white
              px-5
              py-3
              text-sm
              font-medium
              text-gray-700
              transition-all
              hover:bg-gray-50
              hover:border-gray-400
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <RotateCcw className="h-4 w-4" />

            Cancelar
          </button>

          <button
            type="button"
            onClick={onGuardar}
            disabled={guardando}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-teal-700
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              transition-all
              hover:bg-teal-800
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {guardando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}