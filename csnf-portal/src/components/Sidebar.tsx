"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  FileText,
  GitBranch,
  CalendarDays,
  Kanban,
  Users,
  Shield,
  Building2,
  Clock,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

import { Usuario } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  usuario: Usuario | null;
  onLogout: () => void;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: string;
}

interface MenuSection {
  titulo: string;
  items: MenuItem[];
}

/* ============================================================
   MENÚ PRINCIPAL
============================================================ */

const menuPrincipal: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: FileText,
    label: "Documentos",
    href: "/documentos",
    badge: "12",
  },
  {
    icon: GitBranch,
    label: "Flujos de Firma",
    href: "/flujos",
  },
  {
    icon: CalendarDays,
    label: "Agenda y Tareas",
    href: "/agenda",
    badge: "3",
  },
  {
    icon: Kanban,
    label: "Tablero Kanban",
    href: "/kanban",
  },
];

/* ============================================================
   MENÚ ADMINISTRACIÓN
============================================================ */

const menuAdministracion: MenuItem[] = [
  {
    icon: Users,
    label: "Usuarios",
    href: "/usuarios",
  },
  {
    icon: Shield,
    label: "Permisos y Roles",
    href: "/permisos",
  },
  {
    icon: Building2,
    label: "Áreas y Departamentos",
    href: "/areas",
  },
  {
    icon: Clock,
    label: "Auditoría",
    href: "/auditoria",
  },
];

/* ============================================================
   MENÚ MI CUENTA
============================================================ */

const menuCuenta: MenuItem[] = [
  {
    icon: UserCircle,
    label: "Mi Perfil",
    href: "/mi-cuenta/perfil",
  },
  {
    icon: Settings,
    label: "Configuración",
    href: "/mi-cuenta/configuracion",
  },
];

/* ============================================================
   COMPONENTE
============================================================ */

export default function Sidebar({
  usuario,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);

  const esAdministrador =
    usuario?.rol?.nivel !== undefined &&
    usuario.rol.nivel <= 2;

  /* ============================================================
     Render de un Item
  ============================================================ */

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    const activo =
      pathname === item.href ||
      pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",

          activo
            ? "bg-primary-100 text-primary font-semibold"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        {activo && (
          <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}

        <Icon className="h-5 w-5 flex-shrink-0" />

        {!collapsed && (
          <>
            <span className="flex-1 truncate">
              {item.label}
            </span>

            {item.badge && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  /* ============================================================
     Render de una sección
  ============================================================ */

  const renderSection = (section: MenuSection) => (
    <div className="mb-6">

      {!collapsed && (
        <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {section.titulo}
        </h3>
      )}

      <div className="space-y-1">
        {section.items.map(renderItem)}
      </div>

    </div>
  );

  /* ============================================================
     Render
  ============================================================ */

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300",

        collapsed
          ? "w-[72px]"
          : "w-[275px]"
      )}
    >
      {/* Botón contraer */}

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow hover:border-primary hover:bg-primary hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Logo */}

      <div className="flex h-[68px] items-center gap-3 border-b border-gray-100 px-5">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="h-6 w-6"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>

        </div>

        {!collapsed && (
          <div className="overflow-hidden">

            <h2 className="truncate text-sm font-extrabold text-gray-900">
              CSNiños y Familia
            </h2>

            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Portal Corporativo
            </p>

          </div>
        )}

      </div>

      {/* Navegación */}

      <nav className="flex-1 overflow-y-auto px-3 py-5">

        {renderSection({
          titulo: "Principal",
          items: menuPrincipal,
        })}

        {esAdministrador &&
          renderSection({
            titulo: "Administración",
            items: menuAdministracion,
          })}

        {renderSection({
          titulo: "Mi Cuenta",
          items: menuCuenta,
        })}

      </nav>

      {/* ============================================================
          TARJETA DEL USUARIO
          ============================================================ */}

  <div className="border-t border-gray-200 bg-white p-4">

    <Link
        href="/mi-cuenta/perfil"
        className={cn(
          "flex items-center gap-3 rounded-2xl transition-all hover:bg-gray-50",
          collapsed ? "justify-center p-2" : "p-3"
          )}
        >

          {/* Avatar */}

      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white"
      >

        {usuario?.foto_url ? (

          <img
            src={usuario.foto_url}
            alt="Avatar"
            className="h-full w-full object-cover"
          />

        ) : (

          <span>

            {usuario
              ? usuario.tipo_persona === "natural"
                ? `${usuario.nombres?.charAt(0) ?? ""}${usuario.apellidos?.charAt(0) ?? ""}`
                    .toUpperCase()
                : usuario.razon_social
                    ?.split(" ")
                    .filter((_, i) => i < 2)
                    .map((p) => p.charAt(0))
                    .join("")
                    .toUpperCase()
              : "U"}

          </span>

        )}

      </div>

      {!collapsed && (

        <div className="min-w-0 flex-1">

          {/* Nombre */}

          <p className="truncate text-sm font-semibold text-gray-900">

            {usuario
              ? usuario.tipo_persona === "natural"
                ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`
                : usuario.razon_social
              : "Usuario"}

          </p>

          {/* Tipo de usuario */}

            <p className="truncate text-xs text-primary font-medium mt-0.5">

              {usuario?.tipo_usuario ?? "Sin perfil"}

            </p>

          {/* Área */}

              {usuario?.area?.nombre && (

            <p className="truncate text-xs text-gray-500 mt-1">

              {usuario.area.nombre}

            </p>

          )}

          {/* Departamento */}

          {usuario?.departamento?.nombre && (

            <p className="truncate text-[11px] text-gray-400">

              {usuario.departamento.nombre}

            </p>

          )}

        </div>

      )}

    </Link>

    {/* Botón cerrar sesión */}

    {!collapsed && (

      <button
        onClick={onLogout}
        className="
          mt-4
          flex
          w-full
          items-center
          justify-center
          rounded-xl
          border
          border-red-200
          bg-red-50
          px-4
          py-2.5
          text-sm
          font-medium
          text-red-600
          transition-all
          hover:bg-red-100
        "
      >

        Cerrar sesión

      </button>

    )}

  </div>
  </aside>
  );
}