'use client';

interface PrivacidadCardProps {
  consentimientoDatos: boolean;
  onChangeConsentimiento: (valor: boolean) => void;
}

export default function PrivacidadCard({
  consentimientoDatos,
  onChangeConsentimiento,
}: PrivacidadCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Privacidad
      </h2>

      <div className="space-y-6">

        <div>

          <h3 className="text-base font-medium text-gray-900">
            Tratamiento de datos personales
          </h3>

          <p className="mt-2 text-sm text-gray-600 leading-6">
            La Corporación Social Niños y Familia trata los datos personales de
            sus colaboradores conforme a la legislación colombiana vigente y a
            la Política de Tratamiento de Datos Personales de la entidad.
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 p-5">

          <div className="flex items-start justify-between gap-6">

            <div>

              <h4 className="font-medium text-gray-900">
                Consentimiento para el tratamiento de datos
              </h4>

              <p className="text-sm text-gray-500 mt-2">
                Confirmo que conozco la Política de Tratamiento de Datos
                Personales de la Corporación Social Niños y Familia y autorizo
                el tratamiento de mi información conforme a la normatividad
                vigente.
              </p>

            </div>

            <label className="relative inline-flex cursor-pointer items-center">

              <input
                type="checkbox"
                className="peer sr-only"
                checked={consentimientoDatos}
                onChange={(e) =>
                  onChangeConsentimiento(e.target.checked)
                }
              />

              <div className="peer h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />

            </label>

          </div>

        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">

          <p className="text-sm text-blue-800">
            Esta configuración estará vinculada a la aceptación de la Política
            de Tratamiento de Datos Personales cuando el portal se encuentre
            conectado a Supabase.
          </p>

        </div>

      </div>

    </div>
  );
}