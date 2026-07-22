'use client';

export default function AyudaCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Ayuda y Soporte
      </h2>

      <div className="space-y-4">

        {/* Manual */}

        <div className="rounded-xl border border-gray-200 p-5 flex items-center justify-between">

          <div>

            <h3 className="font-medium text-gray-900">
              Manual de Usuario
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Consulte la guía oficial para aprender a utilizar el portal.
            </p>

          </div>

          <button
            className="rounded-lg border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50 transition"
          >
            Abrir
          </button>

        </div>

        {/* Reportar */}

        <div className="rounded-xl border border-gray-200 p-5 flex items-center justify-between">

          <div>

            <h3 className="font-medium text-gray-900">
              Reportar un problema
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Informe errores o dificultades encontradas durante el uso del sistema.
            </p>

          </div>

          <button
            className="rounded-lg border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50 transition"
          >
            Reportar
          </button>

        </div>

        {/* Soporte */}

        <div className="rounded-xl border border-gray-200 p-5 flex items-center justify-between">

          <div>

            <h3 className="font-medium text-gray-900">
              Contactar Soporte
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Comuníquese con el equipo de soporte técnico de la Corporación.
            </p>

          </div>

          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            Contactar
          </button>

        </div>

      </div>

    </div>
  );
}