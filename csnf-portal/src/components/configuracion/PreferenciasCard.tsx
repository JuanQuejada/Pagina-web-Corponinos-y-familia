'use client';

interface PreferenciasCardProps {
  configuracion: {
    idioma: string;
    zonaHoraria: string;
    tema: string;
    formatoFecha: string;
    formatoHora: string;
  };

  onChange: (campo: string, valor: string) => void;
}

export default function PreferenciasCard({
  configuracion,
  onChange,
}: PreferenciasCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Preferencias
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Idioma */}

        <div>

          <label
            htmlFor="idioma"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Idioma
          </label>

          <select
            id="idioma"
            value={configuracion.idioma}
            onChange={(e) =>
              onChange('idioma', e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Español</option>
            <option>English</option>
          </select>

          <p className="mt-2 text-sm text-gray-500">
            Idioma utilizado por la plataforma.
          </p>

        </div>

        {/* Zona Horaria */}

        <div>

          <label
            htmlFor="zonaHoraria"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Zona Horaria
          </label>

          <select
            id="zonaHoraria"
            value={configuracion.zonaHoraria}
            onChange={(e) =>
              onChange('zonaHoraria', e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="America/Bogota">
              Bogotá (GMT-5)
            </option>

            <option value="America/Mexico_City">
              Ciudad de México (GMT-6)
            </option>

            <option value="America/Lima">
              Lima (GMT-5)
            </option>

            <option value="America/Santiago">
              Santiago (GMT-4)
            </option>
          </select>

          <p className="mt-2 text-sm text-gray-500">
            Todas las fechas del sistema utilizarán esta zona horaria.
          </p>

        </div>

        {/* Tema */}

        <div>

          <label
            htmlFor="tema"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tema
          </label>

          <select
            id="tema"
            value={configuracion.tema}
            onChange={(e) =>
              onChange('tema', e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="claro">
              Claro
            </option>

            <option value="oscuro">
              Oscuro
            </option>
          </select>

          <p className="mt-2 text-sm text-gray-500">
            Seleccione el tema visual de la plataforma.
          </p>

        </div>

        {/* Formato Fecha */}

        <div>

          <label
            htmlFor="formatoFecha"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Formato de fecha
          </label>

          <select
            id="formatoFecha"
            value={configuracion.formatoFecha}
            onChange={(e) =>
              onChange('formatoFecha', e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>DD/MM/YYYY</option>

            <option>MM/DD/YYYY</option>

            <option>YYYY-MM-DD</option>
          </select>

        </div>

        {/* Formato Hora */}

        <div>

          <label
            htmlFor="formatoHora"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Formato de hora
          </label>

          <select
            id="formatoHora"
            value={configuracion.formatoHora}
            onChange={(e) =>
              onChange('formatoHora', e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24">
              24 horas
            </option>

            <option value="12">
              12 horas (AM / PM)
            </option>
          </select>

        </div>

      </div>

    </div>
  );
}