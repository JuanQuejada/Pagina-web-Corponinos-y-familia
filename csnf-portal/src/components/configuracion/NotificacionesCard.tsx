'use client';

interface NotificacionesCardProps {
  frecuencia: string;
  onChangeFrecuencia: (valor: string) => void;

  configuracion: {
    eventos: {
      aprobaciones: boolean;
      tareas: boolean;
      mensajes: boolean;
      eventos: boolean;
      documentos: boolean;
    };
  };

  onChangeEvento: (
    evento:
      | 'aprobaciones'
      | 'tareas'
      | 'mensajes'
      | 'eventos'
      | 'documentos',
    valor: boolean
  ) => void;
}

export default function NotificacionesCard({
  frecuencia,
  onChangeFrecuencia,
  configuracion,
  onChangeEvento,
}: NotificacionesCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Notificaciones
      </h2>

      <div className="space-y-8">

        {/* Frecuencia */}

        <div>

          <h3 className="text-base font-medium text-gray-900 mb-4">
            Frecuencia de recordatorios
          </h3>

          <div className="max-w-md">

            <label
              htmlFor="frecuencia"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Frecuencia
            </label>

            <select
              id="frecuencia"
              value={frecuencia}
              onChange={(e) =>
                onChangeFrecuencia(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Inmediata</option>
              <option>Cada hora</option>
              <option>Diaria</option>
              <option>Semanal</option>
              <option>Nunca</option>
            </select>

            <p className="mt-2 text-sm text-gray-500">
              Define la frecuencia con la que recibirás recordatorios del sistema.
            </p>

          </div>

        </div>

        {/* Preferencias */}

        <div className="border-t border-gray-200 pt-8">

          <h3 className="text-base font-medium text-gray-900 mb-5">
            Preferencias por tipo de evento
          </h3>

          <div className="space-y-4">

            <SwitchItem
              titulo="Aprobaciones"
              descripcion="Documentos pendientes por aprobar."
              checked={configuracion.eventos.aprobaciones}
              onChange={(valor) =>
                onChangeEvento('aprobaciones', valor)
              }
            />

            <SwitchItem
              titulo="Tareas"
              descripcion="Asignaciones y actividades pendientes."
              checked={configuracion.eventos.tareas}
              onChange={(valor) =>
                onChangeEvento('tareas', valor)
              }
            />

            <SwitchItem
              titulo="Mensajes"
              descripcion="Mensajes internos enviados por otros usuarios."
              checked={configuracion.eventos.mensajes}
              onChange={(valor) =>
                onChangeEvento('mensajes', valor)
              }
            />

            <SwitchItem
              titulo="Eventos"
              descripcion="Reuniones, agenda y calendario."
              checked={configuracion.eventos.eventos}
              onChange={(valor) =>
                onChangeEvento('eventos', valor)
              }
            />

            <SwitchItem
              titulo="Documentos"
              descripcion="Cambios y publicaciones de documentos."
              checked={configuracion.eventos.documentos}
              onChange={(valor) =>
                onChangeEvento('documentos', valor)
              }
            />

          </div>

        </div>

      </div>

    </div>
  );
}

interface SwitchItemProps {
  titulo: string;
  descripcion: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}

function SwitchItem({
  titulo,
  descripcion,
  checked,
  onChange,
}: SwitchItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">

      <div>

        <h4 className="font-medium text-gray-900">
          {titulo}
        </h4>

        <p className="text-sm text-gray-500 mt-1">
          {descripcion}
        </p>

      </div>

      <label className="relative inline-flex cursor-pointer items-center">

        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) =>
            onChange(e.target.checked)
          }
        />

        <div className="peer h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />

      </label>

    </div>
  );
}