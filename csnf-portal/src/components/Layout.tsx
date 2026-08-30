"use client";

import React from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import { useAuth } from "@/context/AuthContext";

// ============================================================
// TIPOS
// ============================================================

interface LayoutProps {
  children: React.ReactNode;

  titulo: string;

  breadcrumb?: {
    label: string;
    href?: string;
  }[];
}

// ============================================================
// LAYOUT DEL PORTAL
// ============================================================
//
// RESPONSABILIDADES:
//
// 1. Utilizar AuthProvider como fuente de autenticación.
// 2. NO utilizar localStorage para validar la sesión.
// 3. Mantener Sidebar fijo.
// 4. Mantener Header fijo.
// 5. Permitir scroll únicamente en <main>.
// 6. Entregar al Sidebar el Usuario correcto.
//
// ============================================================

export default function Layout({
  children,
  titulo,
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
  // ESTADO DE CARGA
  // ==========================================================

  if (cargando) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">

          <div
            className="
              w-10
              h-10
              border-4
              border-blue-600
              border-t-transparent
              rounded-full
              animate-spin
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

  if (!autenticado || !usuarioPortal) {
    router.replace("/login");

    return (
      <div className="h-dvh w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">

          <div
            className="
              w-10
              h-10
              border-4
              border-blue-600
              border-t-transparent
              rounded-full
              animate-spin
            "
          />

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Redirigiendo al inicio de sesión...
          </p>

        </div>
      </div>
    );
  }

  // ==========================================================
  // USUARIO DEL PORTAL
  // ==========================================================
  //
  // usuarioPortal tiene esta estructura:
  //
  // {
  //   usuario,
  //   asignaciones,
  //   perfilActivo,
  //   permisos,
  //   ...
  // }
  //
  // Sidebar necesita únicamente:
  //
  // Usuario
  //
  // Por eso enviamos:
  //
  // usuarioPortal.usuario
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
  // LAYOUT PRINCIPAL
  // ==========================================================
  //
  // h-dvh:
  //
  // El portal ocupa exactamente la altura visible del
  // dispositivo.
  //
  // overflow-hidden:
  //
  // Impide que el documento completo haga scroll.
  //
  // El scroll se delega exclusivamente al <main>.
  //
  // ==========================================================

  return (
    <div
      className="
        h-dvh
        w-full
        flex
        overflow-hidden
        bg-gray-50
        dark:bg-slate-950
      "
    >

      {/* ======================================================
          SIDEBAR
          ====================================================== */}

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

      {/* ======================================================
          ÁREA PRINCIPAL
          ====================================================== */}

      <div
        className="
          flex-1
          min-w-0
          min-h-0
          h-full
          flex
          flex-col
          overflow-hidden
        "
      >

        {/* ====================================================
            HEADER
            ==================================================== */}

        <div
          className="
            shrink-0
            w-full
          "
        >
          <Header
            usuario={usuario}
            titulo={titulo}
            breadcrumb={breadcrumb}
          />
        </div>

        {/* ====================================================
            CONTENIDO
            ==================================================== */}
        {/*
          ESTE ES EL ÚNICO ELEMENTO QUE PUEDE HACER SCROLL.
        */}

        <main
          className="
            flex-1
            min-h-0
            min-w-0
            overflow-y-auto
            overflow-x-hidden
            p-6
          "
        >
          {children}
        </main>

      </div>

    </div>
  );
}