import type { Usuario, PerfilActivo, UsuarioAsignacion } from "@/types";

export interface InformacionOrganizacionalProps {
  usuario?: Usuario | null;
  perfilActivo?: PerfilActivo | null;
  asignacion?: UsuarioAsignacion | null;
}

export default function InformacionOrganizacional({
  usuario,
  perfilActivo,
  asignacion,
}: InformacionOrganizacionalProps) {
  // Extraer cargo, departamento y área del perfil activo o asignación
  const cargo = perfilActivo?.cargo ?? asignacion?.cargo;
  const rol = perfilActivo?.rol ?? asignacion?.rol;
  const departamento = perfilActivo?.departamento ?? cargo?.departamento;
  const area = perfilActivo?.area ?? departamento?.area;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Información Organizacional
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-500">Área</label>
          <p className="text-sm font-medium text-gray-900">
            {area?.nombre ?? "No asignada"}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Departamento</label>
          <p className="text-sm font-medium text-gray-900">
            {departamento?.nombre ?? "No asignado"}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Cargo</label>
          <p className="text-sm font-medium text-gray-900">
            {cargo?.nombre ?? "No asignado"}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Rol de Sistema</label>
          <p className="text-sm font-medium text-gray-900">
            {rol?.nombre ?? "Sin rol"}
          </p>
        </div>
      </div>
    </div>
  );
}