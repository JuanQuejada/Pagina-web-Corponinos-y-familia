"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
LayoutDashboard,
FolderTree,
Briefcase,
Users,
ShieldCheck,
Settings,
History,
User,
LogOut,
Sliders,
Loader2,
FileText,
GitCommit,
Lock,
Kanban,
CalendarDays,
BellRing,
UserRoundCog,
} from "lucide-react";

import type { Usuario } from "@/types";
import { useAuth } from "@/context/AuthContext";

// ==========================================================
// INTERFACES
// ==========================================================

interface PerfilUsuario {
nombre: string;
cargo: string;
avatarUrl?: string | null;
iniciales: string;
}

interface SidebarProps {
usuario?: Usuario | null;
onLogout?: () => void;
}

// ==========================================================
// MENÚ PRINCIPAL
// ==========================================================

const modulosPrincipal = [
{
nombre: "Documentos",
href: "/principal/documentos",
icono: FileText,
},
{
nombre: "Flujo de Aprobaciones",
href: "/principal/flujo-aprobaciones",
icono: GitCommit,
},
{
nombre: "Repositorio",
href: "/principal/repositorio-privado",
icono: Lock,
},
{
nombre: "Tablero Kanban",
href: "/principal/kanban",
icono: Kanban,
},
{
nombre: "Agenda Institucional",
href: "/principal/eventos",
icono: CalendarDays,
},
{
nombre: "Notificaciones y Alertas",
href: "/principal/notificaciones-alertas",
icono: BellRing,
},
];

// ==========================================================
// MENÚ ADMINISTRACIÓN
// ==========================================================

const modulosAdministracion = [
{
nombre: "Áreas y Departamentos",
href: "/administracion/areas-departamentos",
icono: FolderTree,
},
{
nombre: "Cargos",
href: "/administracion/cargos",
icono: Briefcase,
},
{
nombre: "Usuarios",
href: "/administracion/usuarios",
icono: Users,
},
{
nombre: "Roles y Permisos",
href: "/administracion/roles-permisos",
icono: ShieldCheck,
},
{
nombre: "Auditoría",
href: "/administracion/auditoria",
icono: History,
},
{
nombre: "Ajustes del Sistema",
href: "/administracion/ajustes-sistema",
icono: Settings,
},
];

// ==========================================================
// MENÚ MI CUENTA
// ==========================================================

const modulosMiCuenta = [
{
nombre: "Mi Perfil",
href: "/mi-cuenta/perfil",
icono: User,
},
{
nombre: "Configuración",
href: "/mi-cuenta/configuracion",
icono: Sliders,
},
];

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

function obtenerIniciales(
nombreCompleto: string
): string {
if (!nombreCompleto.trim()) {
return "??";
}

const palabras =
nombreCompleto.trim().split(/\s+/);

if (palabras.length === 1) {
return palabras[0]
.substring(0, 2)
.toUpperCase();
}

return (
palabras[0].charAt(0) +
palabras[palabras.length - 1].charAt(0)
).toUpperCase();
}

// ==========================================================
// OBTENER NOMBRE DE CARGO
// ==========================================================

function obtenerNombreCargo(
usuario: any
): string {

const cargo =
usuario?.cargo ?? null;

if (
cargo &&
typeof cargo === "object"
) {
return (
cargo.nombre ??
"Sin cargo asignado"
);
}

if (
typeof cargo === "string" &&
cargo.trim()
) {
return cargo;
}

return "Sin cargo asignado";
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function Sidebar({
usuario,
onLogout,
}: SidebarProps) {

const pathname = usePathname();
const router = useRouter();

// ========================================================
// CONTEXTO DE AUTENTICACIÓN
// ========================================================

const {
usuarioPortal,
} = useAuth();

// ========================================================
// PERFIL ACTIVO
// ========================================================
//
// IMPORTANTE:
//
// NO utilizamos:
//
// usuarioPortal.asignaciones[0]
//
// porque eso podría corresponder al primer cargo de la
// lista y NO necesariamente al cargo actualmente seleccionado.
//
// La fuente correcta es:
//
// usuarioPortal.perfilActivo
//
// ========================================================

const usuarioContexto =
(usuarioPortal as any)?.usuario ??
usuario ??
null;

const perfilActivo =
(usuarioPortal as any)?.perfilActivo ??
null;

const asignaciones =
Array.isArray(
(usuarioPortal as any)?.asignaciones
)
? (usuarioPortal as any).asignaciones
: [];

// ========================================================
// SOLO ASIGNACIONES ACTIVAS
// ========================================================

const asignacionesActivas =
asignaciones.filter(
(asignacion: any) =>
asignacion?.activo !== false
);

const tieneMultiplesPerfiles =
asignacionesActivas.length > 1;

// ========================================================
// ESTADO VISUAL
// ========================================================

const [perfil, setPerfil] =
useState<PerfilUsuario | null>(null);

const [cargando, setCargando] =
useState(true);

const [falloImagen, setFalloImagen] =
useState(false);

// ========================================================
// CARGAR PERFIL ACTIVO
// ========================================================

useEffect(() => {

if (!usuarioContexto) {
  setPerfil(null);
  setCargando(false);
  return;
}

// ------------------------------------------------------
// NOMBRE
// ------------------------------------------------------

const nombreCrudo =
  usuarioContexto.razon_social ??
  (
    `${usuarioContexto.nombres ?? ""} ${
      usuarioContexto.apellidos ?? ""
    }`.trim() ||
    "Usuario"
  );

const nombreCompletoMayus =
  String(nombreCrudo).toUpperCase();

// ------------------------------------------------------
// CARGO ACTIVO
// ------------------------------------------------------
//
// PRIORIDAD:
//
// 1. perfilActivo.cargo
// 2. usuarioContexto.cargo
//
// Nunca utilizamos asignaciones[0].
// ------------------------------------------------------

let cargoNombre =
  "Sin cargo asignado";

const cargoActivo =
  perfilActivo?.cargo ??
  usuarioContexto?.cargo ??
  null;

if (
  cargoActivo &&
  typeof cargoActivo === "object"
) {

  cargoNombre =
    cargoActivo.nombre ??
    "Sin cargo asignado";

} else if (
  typeof cargoActivo === "string"
) {

  cargoNombre =
    cargoActivo;

}

// ------------------------------------------------------
// CONSTRUIR PERFIL VISUAL
// ------------------------------------------------------

setPerfil({

  nombre:
    nombreCompletoMayus,

  cargo:
    cargoNombre,

  avatarUrl:
    usuarioContexto.foto_url ??
    null,

  iniciales:
    obtenerIniciales(
      nombreCompletoMayus
    ),
});

setFalloImagen(false);
setCargando(false);

}, [
usuarioContexto,
perfilActivo,
]);

// ========================================================
// CAMBIAR PERFIL
// ========================================================

const cambiarPerfil = () => {

if (!tieneMultiplesPerfiles) {
  return;
}

router.push(
  "/seleccionar-perfil"
);

};

// ========================================================
// CERRAR SESIÓN
// ========================================================

const cerrarSesion = async () => {

if (onLogout) {
  await onLogout();
  return;
}

window.location.href =
  "/login";

};

// ========================================================
// CLASE DE ENLACE
// ========================================================

const obtenerClaseEnlace = (
activo: boolean
) => {

return `
  flex
  items-center
  gap-3
  px-3
  py-2.5
  rounded-xl
  text-xs
  font-semibold
  transition-all
  ${
    activo
      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
  }
`;

};

// ========================================================
// RENDER
// ========================================================

return (

<aside
  className="
    h-full
    w-64
    shrink-0
    min-h-0
    flex
    flex-col
    overflow-hidden
    border-r
    border-gray-200
    bg-white
    dark:border-slate-800
    dark:bg-slate-900
    p-4
  "
>

  {/* ====================================================
      LOGO
      ==================================================== */}

  <div
    className="
      shrink-0
      flex
      items-center
      gap-3
      px-2
      py-3
      border-b
      border-gray-100
      dark:border-slate-800
    "
  >

    <div
      className="
        rounded-xl
        bg-blue-600
        p-2.5
        text-xs
        font-bold
        text-white
        shadow-md
        shadow-blue-500/20
      "
    >
      CSNF
    </div>

    <div className="min-w-0">

      <h2
        className="
          text-sm
          font-bold
          leading-tight
          text-gray-900
          dark:text-white
        "
      >
        Portal CSNF
      </h2>

      <p className="text-[11px] text-gray-400">
        Corporación Social
      </p>

    </div>

  </div>

  {/* ====================================================
      ÁREA DE NAVEGACIÓN
      ==================================================== */}

  <div
    className="
      min-h-0
      flex-1
      overflow-y-auto
      overflow-x-hidden
      pr-1
      pt-4
      custom-scrollbar
    "
  >

    <nav className="space-y-5">

      {/* ==================================================
          DASHBOARD
          ================================================== */}

      <div>

        <p
          className="
            mb-2
            px-3
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-gray-400
          "
        >
          Dashboard
        </p>

        <Link
          href="/dashboard"
          className={obtenerClaseEnlace(
            pathname === "/dashboard"
          )}
        >

          <LayoutDashboard
            className="h-4 w-4 shrink-0"
          />

          <span className="truncate">
            Dashboard
          </span>

        </Link>

      </div>

      {/* ==================================================
          PRINCIPAL
          ================================================== */}

      <div>

        <p
          className="
            mb-2
            px-3
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-gray-400
          "
        >
          Principal
        </p>

        <div className="space-y-1">

          {modulosPrincipal.map(
            (modulo) => {

              const Icono =
                modulo.icono;

              const activo =
                pathname ===
                modulo.href;

              return (

                <Link
                  key={modulo.href}
                  href={modulo.href}
                  className={obtenerClaseEnlace(
                    activo
                  )}
                >

                  <Icono
                    className="h-4 w-4 shrink-0"
                  />

                  <span className="truncate">
                    {modulo.nombre}
                  </span>

                </Link>

              );
            }
          )}

        </div>

      </div>

      {/* ==================================================
          ADMINISTRACIÓN
          ================================================== */}

      <div>

        <p
          className="
            mb-2
            px-3
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-gray-400
          "
        >
          Administración
        </p>

        <div className="space-y-1">

          {modulosAdministracion.map(
            (modulo) => {

              const Icono =
                modulo.icono;

              const activo =
                pathname ===
                modulo.href;

              return (

                <Link
                  key={modulo.href}
                  href={modulo.href}
                  className={obtenerClaseEnlace(
                    activo
                  )}
                >

                  <Icono
                    className="h-4 w-4 shrink-0"
                  />

                  <span className="truncate">
                    {modulo.nombre}
                  </span>

                </Link>

              );
            }
          )}

        </div>

      </div>

      {/* ==================================================
          MI CUENTA
          ================================================== */}

      <div>

        <p
          className="
            mb-2
            px-3
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-gray-400
          "
        >
          Mi Cuenta
        </p>

        <div className="space-y-1">

          {modulosMiCuenta.map(
            (modulo) => {

              const Icono =
                modulo.icono;

              const activo =
                pathname ===
                modulo.href;

              return (

                <Link
                  key={modulo.href}
                  href={modulo.href}
                  className={obtenerClaseEnlace(
                    activo
                  )}
                >

                  <Icono
                    className="h-4 w-4 shrink-0"
                  />

                  <span className="truncate">
                    {modulo.nombre}
                  </span>

                </Link>

              );
            }
          )}

        </div>

      </div>

    </nav>

  </div>

  {/* ====================================================
      PERFIL + CAMBIO DE PERFIL + CERRAR SESIÓN
      ==================================================== */}

  <div
    className="
      shrink-0
      pt-4
      mt-4
      border-t
      border-gray-100
      dark:border-slate-800
    "
  >

    {cargando ? (

      <div className="flex justify-center p-3">

        <Loader2
          className="
            h-4
            w-4
            animate-spin
            text-blue-600
          "
        />

      </div>

    ) : (

      <div
        className="
          rounded-xl
          bg-gray-50
          dark:bg-slate-800/60
          p-2.5
          space-y-2
        "
      >

        {/* ==================================================
            PERFIL ACTIVO
            ================================================== */}

        <div className="flex items-center gap-2.5">

          {perfil?.avatarUrl &&
          !falloImagen ? (

            <img
              src={perfil.avatarUrl}
              alt="Avatar"
              onError={() =>
                setFalloImagen(true)
              }
              className="
                h-9
                w-9
                shrink-0
                rounded-lg
                object-cover
                border-2
                border-white
                dark:border-slate-700
                shadow-sm
              "
            />

          ) : (

            <div
              className="
                h-9
                w-9
                shrink-0
                rounded-lg
                bg-blue-100
                dark:bg-blue-950
                text-blue-600
                dark:text-blue-400
                flex
                items-center
                justify-center
                font-bold
                text-sm
                border-2
                border-white
                dark:border-slate-700
                shadow-sm
              "
            >
              {perfil?.iniciales ??
                "??"}
            </div>

          )}

          <div
            className="
              min-w-0
              flex-1
              overflow-hidden
            "
          >

            <p
              className="
                text-xs
                font-bold
                leading-tight
                text-gray-900
                dark:text-white
                line-clamp-2
                uppercase
              "
              title={perfil?.nombre}
            >
              {perfil?.nombre}
            </p>

            <p
              className="
                mt-0.5
                text-[10px]
                font-semibold
                text-blue-600
                dark:text-blue-400
                line-clamp-2
              "
              title={perfil?.cargo}
            >
              {perfil?.cargo}
            </p>

          </div>

        </div>

        {/* ==================================================
            CAMBIAR PERFIL
            ================================================== */}

        {tieneMultiplesPerfiles && (

          <button
            type="button"
            onClick={cambiarPerfil}
            className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-blue-200
              bg-blue-50
              dark:border-blue-900/60
              dark:bg-blue-950/40
              px-3
              py-2
              text-xs
              font-semibold
              text-blue-700
              dark:text-blue-300
              transition-all
              hover:bg-blue-100
              dark:hover:bg-blue-900/50
            "
          >

            <UserRoundCog
              className="h-4 w-4"
            />

            Cambiar perfil

          </button>

        )}

        {/* ==================================================
            CERRAR SESIÓN
            ================================================== */}

        <button
          type="button"
          onClick={cerrarSesion}
          className="
            w-full
            flex
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-red-50
            dark:bg-red-950/40
            px-3
            py-2
            text-xs
            font-semibold
            text-red-600
            dark:text-red-400
            transition-all
            hover:bg-red-100
            dark:hover:bg-red-900/40
          "
        >

          <LogOut
            className="h-4 w-4"
          />

          Cerrar Sesión

        </button>

      </div>

    )}

  </div>

</aside>

);
}