'use client';

import { useState } from 'react';

export default function SeguridadCuenta() {

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');

  return (

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

      <h2 className="text-lg font-bold mb-6">
        Seguridad
      </h2>

      <div className="space-y-5">

        <div>
          <label htmlFor="passwordActual" className="block text-sm font-medium mb-1">
            Contraseña actual
          </label>

          <input
            id="passwordActual"
            type="password"
            value={actual}
            onChange={(e)=>setActual(e.target.value)}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="passwordNueva" className="block text-sm font-medium mb-1">
            Nueva contraseña
          </label>

          <input
            id="passwordNueva"
            type="password"
            value={nueva}
            onChange={(e)=>setNueva(e.target.value)}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="passwordConfirmar" className="block text-sm font-medium mb-1">
            Confirmar contraseña
          </label>

          <input
            id="passwordConfirmar"
            type="password"
            value={confirmar}
            onChange={(e)=>setConfirmar(e.target.value)}
            className="w-full rounded-lg border p-3"
          />
        </div>

      </div>

    </div>

  );

}