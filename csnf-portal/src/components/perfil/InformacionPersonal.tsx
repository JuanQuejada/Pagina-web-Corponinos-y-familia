'use client';

import { Usuario } from '@/types';

interface InformacionPersonalProps {
  usuario: Usuario;
  onChange: (campo: string, valor: string) => void;
}

export default function InformacionPersonal({
  usuario,
  onChange,
}: InformacionPersonalProps) {
  const esPersonaNatural =
    usuario.tipo_persona === 'natural';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Información Personal
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Tipo Persona */}

        <div>
          <label
            htmlFor="tipoPersona"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tipo de Persona
          </label>

          <input
            id="tipoPersona"
            value={
              usuario.tipo_persona === 'natural'
                ? 'Persona Natural'
                : 'Persona Jurídica'
            }
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        {/* Tipo Usuario */}

        <div>
          <label
            htmlFor="tipoUsuario"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tipo de Usuario
          </label>

          <input
            id="tipoUsuario"
            value={usuario.tipo_usuario ?? ''}
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        {/* Persona Natural */}

        {esPersonaNatural ? (
          <>
            <div>
              <label
                htmlFor="nombres"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombres
              </label>

              <input
                id="nombres"
                value={usuario.nombres ?? ''}
                disabled
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
              />
            </div>

            <div>
              <label
                htmlFor="apellidos"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Apellidos
              </label>

              <input
                id="apellidos"
                value={usuario.apellidos ?? ''}
                disabled
                className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
              />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label
              htmlFor="razonSocial"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Razón Social
            </label>

            <input
              id="razonSocial"
              value={usuario.razon_social ?? ''}
              disabled
              className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
            />
          </div>
        )}

        {/* Documento */}

        <div>
          <label
            htmlFor="tipoDocumento"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tipo de Documento
          </label>

          <input
            id="tipoDocumento"
            value={usuario.tipo_documento ?? ''}
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        <div>
          <label
            htmlFor="numeroDocumento"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Número de Documento
          </label>

          <input
            id="numeroDocumento"
            value={usuario.numero_documento ?? ''}
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        {/* Teléfono */}

        <div>
          <label
            htmlFor="telefono"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Teléfono
          </label>

          <input
            id="telefono"
            value={usuario.telefono ?? ''}
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        {/* Dirección */}

        <div>
          <label
            htmlFor="direccion"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Dirección
          </label>

          <input
            id="direccion"
            value={usuario.direccion ?? ''}
            disabled
            className="w-full rounded-xl border border-gray-300 bg-gray-100 p-3"
          />
        </div>

        {/* Fecha nacimiento */}

        {esPersonaNatural && (
          <div>
            <label
              htmlFor="fechaNacimiento"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Fecha de Nacimiento
            </label>

            <input
              id="fechaNacimiento"
              name="fechaNacimiento"
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