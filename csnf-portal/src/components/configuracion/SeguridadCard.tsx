'use client';

interface SeguridadCardProps {
  configuracion: {
    correo: string;
  };
  onChange: (campo: string, valor: string) => void;
}

export default function SeguridadCard({
  configuracion,
  onChange,
}: SeguridadCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Seguridad
      </h2>

      <div className="space-y-8">

        {/* ==========================================
            Correo electrónico
        ========================================== */}

        <div>

          <h3 className="text-base font-medium text-gray-900 mb-4">
            Correo electrónico
          </h3>

          <div>

            <label
              htmlFor="correo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              value={configuracion.correo}
              onChange={(e) =>
                onChange('correo', e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="mt-2 text-sm text-gray-500">
              Este correo será utilizado para acceder al sistema y recibir notificaciones institucionales.
            </p>

          </div>

        </div>

        {/* ==========================================
            Cambio de contraseña
        ========================================== */}

        <div className="border-t border-gray-200 pt-8">

          <h3 className="text-base font-medium text-gray-900 mb-4">
            Cambio de contraseña
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div>

              <label
                htmlFor="passwordActual"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contraseña actual
              </label>

              <input
                id="passwordActual"
                type="password"
                placeholder="********"
                className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div>

              <label
                htmlFor="passwordNueva"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nueva contraseña
              </label>

              <input
                id="passwordNueva"
                type="password"
                placeholder="********"
                className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div>

              <label
                htmlFor="passwordConfirmar"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmar contraseña
              </label>

              <input
                id="passwordConfirmar"
                type="password"
                placeholder="********"
                className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

            <p className="text-sm font-medium text-blue-800 mb-2">
              Requisitos de la contraseña
            </p>

            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Mínimo 8 caracteres.</li>
              <li>Al menos una letra mayúscula.</li>
              <li>Al menos una letra minúscula.</li>
              <li>Al menos un número.</li>
              <li>Al menos un carácter especial.</li>
            </ul>

          </div>

        </div>

        {/* ==========================================
            Dispositivos
        ========================================== */}

        <div className="border-t border-gray-200 pt-8">

          <h3 className="text-base font-medium text-gray-900 mb-4">
            Dispositivos con sesión iniciada
          </h3>

          <div className="overflow-x-auto">

            <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">

              <thead className="bg-gray-100">

                <tr>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Dispositivo
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Navegador
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Última actividad
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Estado
                  </th>

                </tr>

              </thead>

              <tbody>

                <tr className="border-t">

                  <td className="px-4 py-3">
                    Equipo principal
                  </td>

                  <td className="px-4 py-3">
                    Microsoft Edge
                  </td>

                  <td className="px-4 py-3">
                    Hace unos segundos
                  </td>

                  <td className="px-4 py-3">

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Sesión actual
                    </span>

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          <p className="mt-3 text-sm text-gray-500">
            Cuando el sistema esté conectado a Supabase, aquí se mostrarán todas las sesiones activas del usuario.
          </p>

        </div>

      </div>

    </div>
  );
}