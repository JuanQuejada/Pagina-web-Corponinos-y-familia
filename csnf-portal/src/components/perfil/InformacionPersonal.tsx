'use client';

import { Usuario } from '@/types';

interface InformacionPersonalProps {
  usuario: Usuario;
  onChange: (
    campo: keyof Usuario,
    valor: string | null
  ) => void;
}

export default function InformacionPersonal({
  usuario,
  onChange,
}: InformacionPersonalProps) {

  const esPersonaNatural =
    usuario.tipo_persona === 'natural';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      {/* ==========================================================
          TÍTULO
      ========================================================== */}

      <div className="mb-6">

        <h2 className="text-xl font-bold text-gray-900">
          Información Personal
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Información básica registrada para el usuario.
        </p>

      </div>

      {/* ==========================================================
          INFORMACIÓN GENERAL
      ========================================================== */}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Tipo Persona */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de Persona
          </label>

          <input
            disabled
            value={
              esPersonaNatural
                ? 'Persona Natural'
                : 'Persona Jurídica'
            }
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Tipo Usuario */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de Usuario
          </label>

          <input
            disabled
            value={usuario.tipo_usuario ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* ======================================================
            PERSONA NATURAL
        ====================================================== */}

        {esPersonaNatural ? (

          <>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombres
              </label>

              <input
                disabled
                value={usuario.nombres ?? ''}
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Apellidos
              </label>

              <input
                disabled
                value={usuario.apellidos ?? ''}
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
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
              value={usuario.razon_social ?? ''}
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />

          </div>

        )}

        {/* Tipo Documento */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de Documento
          </label>

          <input
            disabled
            value={usuario.tipo_documento ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Número Documento */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Número de Documento
          </label>

          <input
            disabled
            value={usuario.numero_documento ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Correo */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Correo Electrónico
          </label>

          <input
            disabled
            value={usuario.email}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Teléfono */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Teléfono
          </label>

          <input
            disabled
            value={usuario.telefono ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Dirección */}

        <div className="md:col-span-2">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Dirección
          </label>

          <input
            disabled
            value={usuario.direccion ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

      </div>

      {/* ==========================================================
          INFORMACIÓN ORGANIZACIONAL
      ========================================================== */}

      <div className="my-8 border-t border-gray-200"></div>

      <div className="mb-6">

        <h2 className="text-xl font-bold text-gray-900">
          Información Organizacional
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Información relacionada con la vinculación dentro de la organización.
        </p>

      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Área */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Área
          </label>

          <input
            disabled
            value={usuario.area?.nombre ?? 'No asignada'}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Departamento */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Departamento
          </label>

          <input
            disabled
            value={usuario.departamento?.nombre ?? 'No asignado'}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Cargo */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Cargo
          </label>

          <input
            disabled
            value={usuario.cargo ?? 'Asignado al área'}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Fecha Vinculación */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Fecha de Vinculación
          </label>

          <input
            disabled
            type="date"
            value={usuario.fecha_vinculacion ?? ''}
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />

        </div>

        {/* Fecha Nacimiento */}

        {esPersonaNatural && (

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha de Nacimiento
            </label>

            <input
              type="date"
              value={usuario.fecha_nacimiento ?? ''}
              onChange={(e) =>
                onChange(
                  'fecha_nacimiento',
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-300 p-3"
            />

          </div>

        )}

      </div>

    </div>
  );
}