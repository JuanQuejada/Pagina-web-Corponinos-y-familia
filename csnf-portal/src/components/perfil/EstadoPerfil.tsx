'use client';

import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
} from 'lucide-react';

interface EstadoPerfilProps {
  perfilCompleto: boolean;
  passwordCambiada: boolean;
}

export default function EstadoPerfil({
  perfilCompleto,
  passwordCambiada,
}: EstadoPerfilProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Estado del Perfil
      </h2>

      <div className="space-y-4">

        {/* Perfil */}

        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">

          <div className="flex items-center gap-3">

            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                perfilCompleto
                  ? 'bg-green-100'
                  : 'bg-yellow-100'
              }`}
            >
              {perfilCompleto ? (
                <UserCheck className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
            </div>

            <div>

              <p className="font-medium text-gray-800">
                Información Personal
              </p>

              <p className="text-sm text-gray-500">
                {perfilCompleto
                  ? 'Perfil completamente diligenciado.'
                  : 'Faltan datos por completar.'}
              </p>

            </div>

          </div>

          {perfilCompleto ? (
            <CheckCircle2 className="text-green-600 w-6 h-6" />
          ) : (
            <AlertTriangle className="text-yellow-500 w-6 h-6" />
          )}

        </div>

        {/* Contraseña */}

        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">

          <div className="flex items-center gap-3">

            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                passwordCambiada
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              <Lock
                className={`w-5 h-5 ${
                  passwordCambiada
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              />
            </div>

            <div>

              <p className="font-medium text-gray-800">
                Contraseña
              </p>

              <p className="text-sm text-gray-500">
                {passwordCambiada
                  ? 'La contraseña ya fue actualizada.'
                  : 'Debe cambiar la contraseña inicial.'}
              </p>

            </div>

          </div>

          {passwordCambiada ? (
            <CheckCircle2 className="text-green-600 w-6 h-6" />
          ) : (
            <AlertTriangle className="text-red-500 w-6 h-6" />
          )}

        </div>

      </div>

    </div>
  );
}