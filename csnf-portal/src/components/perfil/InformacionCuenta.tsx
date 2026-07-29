'use client';

import { Usuario } from '@/types';

interface Props {
  usuario: Usuario;
}

export default function InformacionCuenta({ usuario }: Props) {
  const u = usuario as any;

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
            value={u.activo ? 'Activo' : 'Inactivo'}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Rol
          </label>
          <input
            readOnly
            value={u.rol?.descripcion ?? u.rol?.nombre ?? u.rol ?? ''}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Fecha de creación
          </label>
          <input
            readOnly
            value={u.created_at ? new Date(u.created_at).toLocaleString() : ''}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Último acceso
          </label>
          <input
            readOnly
            value={u.ultimo_login ? new Date(u.ultimo_login).toLocaleString() : 'Sin registros'}
            className="w-full rounded-lg border bg-gray-100 p-3"
          />
        </div>
      </div>
    </div>
  );
}