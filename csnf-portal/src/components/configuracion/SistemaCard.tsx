'use client';

export default function SistemaCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Información del Sistema
      </h2>

      <div className="space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Sistema
            </label>

            <input
              disabled
              value="Portal Corporación Social Niños y Familia"
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Versión
            </label>

            <input
              disabled
              value="1.0.0"
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ambiente
            </label>

            <input
              disabled
              value="Desarrollo"
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Última actualización
            </label>

            <input
              disabled
              value="Julio 2026"
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />

          </div>

        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

          <p className="text-sm text-blue-800">

            Esta información será actualizada automáticamente conforme se publiquen nuevas
            versiones del portal institucional.

          </p>

        </div>

      </div>

    </div>
  );
}