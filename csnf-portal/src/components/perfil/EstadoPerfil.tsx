'use client';

import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Activity,
} from 'lucide-react';

interface EstadoPerfilProps {
  perfilCompleto: boolean;
  passwordCambiada: boolean;
  activo?: boolean;
}

export default function EstadoPerfil({
  perfilCompleto,
  passwordCambiada,
  activo = true,
}: EstadoPerfilProps) {
  //-------------------------------------------------------
  // Porcentaje de completitud
  //-------------------------------------------------------

  let progreso = 0;

  if (perfilCompleto) progreso += 35;
  if (passwordCambiada) progreso += 35;
  if (activo) progreso += 30;

  //-------------------------------------------------------

  const EstadoItem = ({
    titulo,
    activo,
    icono,
    textoActivo,
    textoInactivo,
  }: {
    titulo: string;
    activo: boolean;
    icono: React.ReactNode;
    textoActivo: string;
    textoInactivo: string;
  }) => (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">

      <div className="flex items-center gap-3">

        <div
          className={`rounded-full p-2 ${
            activo
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {icono}
        </div>

        <div>

          <p className="text-sm font-semibold text-gray-800">
            {titulo}
          </p>

          <p className="text-xs text-gray-500">
            {activo ? textoActivo : textoInactivo}
          </p>

        </div>

      </div>

      {activo ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : (
        <AlertCircle className="h-5 w-5 text-amber-500" />
      )}

    </div>
  );

  //-------------------------------------------------------

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <h2 className="mb-6 text-lg font-semibold text-gray-900">
        Estado de la Cuenta
      </h2>

      <div className="space-y-4">

        <EstadoItem
          titulo="Perfil"
          activo={perfilCompleto}
          textoActivo="Información completa"
          textoInactivo="Faltan datos por completar"
          icono={<UserCheck className="h-5 w-5" />}
        />

        <EstadoItem
          titulo="Seguridad"
          activo={passwordCambiada}
          textoActivo="Contraseña actualizada"
          textoInactivo="Debe actualizar la contraseña"
          icono={<ShieldCheck className="h-5 w-5" />}
        />

        <EstadoItem
          titulo="Cuenta"
          activo={activo}
          textoActivo="Cuenta activa"
          textoInactivo="Cuenta inactiva"
          icono={<Activity className="h-5 w-5" />}
        />

      </div>

      <div className="mt-8">

        <div className="mb-2 flex items-center justify-between">

          <span className="text-sm font-medium text-gray-700">
            Nivel de completitud
          </span>

          <span className="text-sm font-bold text-primary">
            {progreso}%
          </span>

        </div>

        <div className="h-3 overflow-hidden rounded-full bg-gray-200">

          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${progreso}%`,
            }}
          />

        </div>

      </div>

    </div>
  );
}