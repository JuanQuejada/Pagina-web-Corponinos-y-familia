'use client';

import { Usuario } from '@/types';

interface Props {
  usuario: Usuario;
}

export default function InformacionCuenta({ usuario }: Props) {

  return (

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

      <h2 className="text-lg font-bold mb-6">
        Información de la Cuenta
      </h2>

      <div className="grid md:grid-cols-2 gap-5">

        <div>

          <label className="block text-sm font-medium mb-1">
            Estado
          </label>

          <input
            readOnly
            value={usuario.activo ? 'Activo' : 'Inactivo'}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />

        </div>

        <div>

          <label className="block text-sm font-medium mb-1">
            Rol
          </label>

          <input
            readOnly
            value={usuario.rol?.descripcion ?? usuario.rol?.nombre ?? ''}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />

        </div>

        <div>

          <label className="block text-sm font-medium mb-1">
            Fecha de creación
          </label>

          <input
            readOnly
            value={usuario.created_at}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />

        </div>

        <div>

          <label className="block text-sm font-medium mb-1">
            Último acceso
          </label>

          <input
            readOnly
            value={usuario.ultimo_login ?? 'Sin registros'}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />

        </div>

      </div>

    </div>

  );

}