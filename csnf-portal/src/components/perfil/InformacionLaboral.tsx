'use client';

import { Usuario } from '@/types';

interface Props {
  usuario: Usuario;
}

export default function InformacionLaboral({
  usuario,
}: Props) {

  return (

    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mt-6">

      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Información Laboral
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <Campo
          titulo="Área"
          valor={usuario.area?.nombre}
        />

        <Campo
          titulo="Departamento"
          valor={usuario.departamento?.nombre}
        />

        <Campo
          titulo="Cargo"
          valor={usuario.cargo}
        />

        <Campo
          titulo="Rol"
          valor={usuario.rol?.nombre}
        />

        <Campo
          titulo="Tipo de contrato"
          valor={usuario.tipo_contrato}
        />

        <Campo
          titulo="Fecha vinculación"
          valor={usuario.fecha_vinculacion}
        />

      </div>

    </div>

  );

}

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor?: string | null;
}) {

  return (

    <div>

      <label className="block text-sm font-semibold mb-2">

        {titulo}

      </label>

      <input
        title={titulo}
        disabled
        value={valor ?? ''}
        className="w-full rounded-xl border bg-gray-100 p-3"
      />

    </div>

  );

}