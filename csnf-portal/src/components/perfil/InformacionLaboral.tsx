'use client';

import { Usuario } from '@/types';

interface InformacionLaboralProps {
  usuario: Usuario | null;
}

export default function InformacionLaboral({
  usuario,
}: InformacionLaboralProps) {
  if (!usuario) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Información Laboral
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <div>
          <label
            htmlFor="area"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Área
          </label>

          <input
            id="area"
            type="text"
            value={usuario.area?.nombre ?? ''}
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="departamento"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Departamento
          </label>

          <input
            id="departamento"
            type="text"
            value={usuario.departamento?.nombre ?? ''}
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="cargo"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Cargo
          </label>

          <input
            id="cargo"
            type="text"
            value={usuario.cargo ?? ''}
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="contrato"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tipo de contrato
          </label>

          <input
            id="contrato"
            type="text"
            value={usuario.tipo_contrato ?? ''}
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="fecha"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Fecha de vinculación
          </label>

          <input
            id="fecha"
            type="text"
            value={usuario.fecha_vinculacion ?? ''}
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="jefe"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Jefe inmediato
          </label>

          <input
            id="jefe"
            type="text"
            value={
              usuario.jefe_directo
                ? `${usuario.jefe_directo.nombres ?? ''} ${usuario.jefe_directo.apellidos ?? ''}`
                : ''
            }
            readOnly
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

      </div>

    </section>
  );
}