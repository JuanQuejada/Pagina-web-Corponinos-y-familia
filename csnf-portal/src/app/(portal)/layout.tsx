"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import { useAuth } from "@/context/AuthContext";

// ============================================================
// TIPOS
// ============================================================
//
// IMPORTANTE:
//
// En Next.js App Router, un layout recibe obligatoriamente
// "children". Los props personalizados como "titulo" y
// "breadcrumb" no son enviados automáticamente por Next.js.
//
// Por eso se mantienen como OPCIONALES.
//
// Esto permite que Next.js 16 pueda validar correctamente
// este layout durante "next build".
// ============================================================

interface LayoutProps {
  children: React.ReactNode;

  titulo?: string;

  breadcrumb?: {
    label: string;
    href?: string;
  }[];
}

// ============================================================
// LAYOUT PRINCIPAL DEL PORTAL
// ============================================================
//
// RESPONSABILIDADES:
//
// 1. Utilizar AuthProvider como fuente de autenticación.
// 2. NO utilizar localStorage para comprobar la sesión.
// 3. Mantener Sidebar fijo.
// 4. Mantener Header fijo.
// 5. Permitir desplazamiento únicamente en <main>.
// 6. Redirigir al login solamente desde useEffect.
// 7. Ser compatible con la firma de Layout de Next.js 16.
// ============================================================

export default function Layout({
  children,
  titulo = "Portal",
  breadcrumb,
}: LayoutProps) {
  const router = useRouter();

  // ==========================================================
  // AUTENTICACIÓN
  // ==========================================================

  const {
    usuarioPortal,
    cargando,
    autenticado,
    cerrarSesion,
  } = useAuth();

  // ==========================================================
  // REDIRECCIÓN SI NO EXISTE SESIÓN
  // ==========================================================
  //
  // IMPORTANTE:
  //
  // NUNCA hacemos router.replace() directamente durante
  // el render.
  //
  // La navegación se ejecuta exclusivamente dentro de
  // useEffect().
  //
  // Esto evita el error:
  //
  // "Cannot update a component (Router) while rendering
  // a different component (Layout)"
  //
  // ==========================================================

  useEffect(() => {
    if (cargando) {
      return;
    }

    if (!autenticado || !usuarioPortal) {
      router.replace("/login");
    }
  }, [
    cargando,
    autenticado,
    usuarioPortal,
    router,
  ]);

  // ==========================================================
  // ESTADO DE CARGA
  // ==========================================================

  if (cargando) {
    return (
      <div
        className="
          fixed
          inset-0
          flex
          items-center
          justify-center
          bg-gray-50
          dark:bg-slate-950
        "
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-blue-600
              border-t-transparent
            "
          />

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Cargando portal...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // SIN AUTENTICACIÓN
  // ==========================================================
  //
  // NO hacemos router.replace() aquí.
  //
  // useEffect() se encarga de realizar la navegación.
  //
  // Mientras se produce la redirección mostramos una pantalla
  // de espera para evitar renderizar el portal sin usuario.
  //
  // ==========================================================

  if (!autenticado || !usuarioPortal) {
    return (
      <div
        className="
          fixed
          inset-0
          flex
          items-center
          justify-center
          bg-gray-50
          dark:bg-slate-950
        "
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-blue-600
              border-t-transparent
            "
          />

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // USUARIO DEL PORTAL
  // ==========================================================
  //
  // usuarioPortal:
  //
  // {
  //   usuario,
  //   asignaciones,
  //   perfilActivo,
  //   permisos,
  //   autenticado
  // }
  //
  // Sidebar recibe directamente el usuario base.
  //
  // ==========================================================

  const usuario = usuarioPortal.usuario;

  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  const handleLogout = async () => {
    try {
      await cerrarSesion();
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    } finally {
      router.replace("/login");
    }
  };

  // ==========================================================
  // PORTAL
  // ==========================================================

  return (
    <div
      className="
        fixed
        inset-0
        flex
        overflow-hidden
        bg-gray-50
        dark:bg-slate-950
      "
    >
      {/* ====================================================
          SIDEBAR
          ==================================================== */}

      <div
        className="
          h-full
          shrink-0
          overflow-hidden
        "
      >
        <Sidebar
          usuario={usuario}
          onLogout={handleLogout}
        />
      </div>

      {/* ====================================================
          COLUMNA DERECHA
          ==================================================== */}

      <div
        className="
          flex
          h-full
          min-h-0
          min-w-0
          flex-1
          flex-col
          overflow-hidden
        "
      >
        {/* ==================================================
            HEADER
            ================================================== */}

        <header
          className="
            w-full
            shrink-0
          "
        >
          <Header
            usuario={usuario}
            titulo={titulo}
            breadcrumb={breadcrumb}
          />
        </header>

        {/* ==================================================
            CONTENIDO
            ================================================== */}

        <main
          className="
            min-h-0
            min-w-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            p-6
          "
        >
          {children}
        </main>
      </div>
    </div>
  );
}