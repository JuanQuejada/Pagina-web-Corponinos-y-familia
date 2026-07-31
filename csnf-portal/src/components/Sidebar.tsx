"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
} from "lucide-react";

import type { Usuario } from "@/types";

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

function obtenerIniciales(nombreCompleto: string): string {
  if (!nombreCompleto.trim()) return "??";

  const palabras = nombreCompleto.trim().split(/\s+/);

  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase();
  }

  return (
    palabras[0].charAt(0) +
    palabras[palabras.length - 1].charAt(0)
  ).toUpperCase();
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function Sidebar({
  usuario,
  onLogout,
}: SidebarProps) {

  const pathname = usePathname();

  const [perfil, setPerfil] =
    useState<PerfilUsuario | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [falloImagen, setFalloImagen] =
    useState(false);

  // ==========================================================
  // CARGAR PERFIL
  // ==========================================================

  useEffect(() => {

    if (!usuario) {
      setPerfil(null);
      setCargando(false);
      return;
    }

    // Obtener el nombre o razón social con paréntesis para evitar conflictos de operadores
    const nombreCrudo =
      usuario.razon_social ??
      (`${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() ||
        "Usuario");

    const nombreCompletoMayus = nombreCrudo.toUpperCase();

    // Obtener el nombre del cargo de forma segura (sea objeto o string)
    let cargoNombre = "Sin cargo asignado";
    if (usuario.cargo) {
      if (typeof usuario.cargo === "object" && "nombre" in usuario.cargo) {
        cargoNombre = (usuario.cargo as { nombre?: string })?.nombre ?? "Sin cargo asignado";
      } else if (typeof usuario.cargo === "string") {
        cargoNombre = usuario.cargo;
      }
    }

    setPerfil({
      nombre: nombreCompletoMayus,
      cargo: cargoNombre,
      avatarUrl: usuario.foto_url ?? null,
      iniciales: obtenerIniciales(nombreCompletoMayus),
    });

    setFalloImagen(false);
    setCargando(false);

  }, [usuario]);

  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  const cerrarSesion = async () => {

    if (onLogout) {
      await onLogout();
      return;
    }

    window.location.href = "/login";

  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 min-h-screen flex flex-col justify-between p-4 shrink-0 transition-all">

      <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-1 custom-scrollbar">

        {/* ====================================================== */}
        {/* LOGO */}
        {/* ====================================================== */}

        <div className="flex items-center gap-3 px-2 py-3 border-b border-gray-100 dark:border-slate-800">

          <div className="p-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20">
            CSNF
          </div>

          <div>

            <h2 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
              Portal CSNF
            </h2>

            <p className="text-[11px] text-gray-400">
              Corporación Social
            </p>

          </div>

        </div>

        {/* ====================================================== */}
        {/* NAVEGACIÓN */}
        {/* ====================================================== */}

        <nav className="space-y-4">

          {/* DASHBOARD */}

          <div>

            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Dashboard
            </p>

            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
              }`}
            >

              <LayoutDashboard className="h-4 w-4" />

              <span>Dashboard</span>

            </Link>

          </div>

          {/* PRINCIPAL */}

          <div>

            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Principal
            </p>

            <div className="space-y-1">

              {modulosPrincipal.map((modulo) => {

                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (

                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >

                    <Icono className="h-4 w-4 shrink-0" />

                    <span className="truncate">
                      {modulo.nombre}
                    </span>

                  </Link>

                );

              })}

            </div>

          </div>

          {/* ADMINISTRACIÓN */}

          <div>

            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Administración
            </p>

            <div className="space-y-1">

              {modulosAdministracion.map((modulo) => {

                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (

                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >

                    <Icono className="h-4 w-4 shrink-0" />

                    <span className="truncate">
                      {modulo.nombre}
                    </span>

                  </Link>

                );

              })}

            </div>

          </div>

          {/* MI CUENTA */}

          <div>

            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Mi Cuenta
            </p>

            <div className="space-y-1">

              {modulosMiCuenta.map((modulo) => {

                const Icono = modulo.icono;
                const activo = pathname === modulo.href;

                return (

                  <Link
                    key={modulo.href}
                    href={modulo.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activo
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >

                    <Icono className="h-4 w-4 shrink-0" />

                    <span className="truncate">
                      {modulo.nombre}
                    </span>

                  </Link>

                );

              })}

            </div>

          </div>

        </nav>

      </div>

      {/* ====================================================== */}
      {/* MINI PERFIL */}
      {/* ====================================================== */}

      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">

        {cargando ? (

          <div className="flex justify-center p-3">

            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />

          </div>

        ) : (

          <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-2">

            <div className="flex items-center gap-2.5">

              {perfil?.avatarUrl && !falloImagen ? (

                <img
                  src={perfil.avatarUrl}
                  alt="Avatar"
                  onError={() => setFalloImagen(true)}
                  className="h-9 w-9 rounded-lg object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                />

              ) : (

                <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border-2 border-white dark:border-slate-700 shadow-sm shrink-0">

                  {perfil?.iniciales ?? "??"}

                </div>

              )}

              <div className="min-w-0 flex-1 overflow-hidden">

                {/* Nombre en MAYÚSCULAS y permitido en 2 líneas */}
                <p
                  className="text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 uppercase"
                  title={perfil?.nombre}
                >

                  {perfil?.nombre}

                </p>

                {/* Cargo real debajo del nombre */}
                <p
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold line-clamp-2 mt-0.5"
                  title={perfil?.cargo}
                >

                  {perfil?.cargo}

                </p>

              </div>

            </div>

            <button
              onClick={cerrarSesion}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-xs font-semibold"
            >

              <LogOut className="h-4 w-4" />

              Cerrar Sesión

            </button>

          </div>

        )}

      </div>

    </aside>

  );

}