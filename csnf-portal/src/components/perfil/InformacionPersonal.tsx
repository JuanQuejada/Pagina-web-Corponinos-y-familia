"use client";

import { Usuario } from "@/types";

interface InformacionPersonalProps {
  usuario: Usuario;
}

export default function InformacionPersonal({
  usuario,
}: InformacionPersonalProps) {
  //----------------------------------------------------------
  // Tipo de persona
  //----------------------------------------------------------
  const esPersonaNatural = usuario.tipoPersona?.codigo === "NATURAL";

  //----------------------------------------------------------
  // Render
  //----------------------------------------------------------
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/*==========================================================
        TÍTULO
      ==========================================================*/}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Información Personal
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Información registrada del usuario.
        </p>
      </div>

      {/*==========================================================
        INFORMACIÓN BÁSICA
      ==========================================================*/}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Tipo de Persona */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de Persona
          </label>
          <input
            disabled
            value={usuario.tipoPersona?.nombre ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Tipo de Identificación */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de Identificación
          </label>
          <input
            disabled
            value={usuario.tipoIdentificacion?.nombre ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Persona Natural vs Jurídica */}
        {esPersonaNatural ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombres
              </label>
              <input
                disabled
                value={usuario.nombres ?? ""}
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Apellidos
              </label>
              <input
                disabled
                value={usuario.apellidos ?? ""}
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
              />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Razón Social
            </label>
            <input
              disabled
              value={usuario.razon_social ?? ""}
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
            />
          </div>
        )}

        {/* Número de Identificación */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Número de Identificación
          </label>
          <input
            disabled
            value={usuario.numero_identificacion ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Correo */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Correo Electrónico
          </label>
          <input
            disabled
            value={usuario.email ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            disabled
            value={usuario.telefono ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Dirección (Único bloque limpio, sin duplicados) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Dirección
          </label>
          <input
            disabled
            value={usuario.direccion ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Estado del Usuario
          </label>
          <input
            disabled
            value={usuario.estadoUsuario?.nombre ?? ""}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800"
          />
        </div>
      </div>
    </div>
  );
}