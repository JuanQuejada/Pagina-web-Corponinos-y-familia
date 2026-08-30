"use client";

// ============================================================
// LAYOUT ADMINISTRACIÓN
// Portal Corporación Social Niños y Familia
//
// RESPONSABILIDAD:
//
// Este layout protege EXCLUSIVAMENTE:
//
//   /administracion
//
// y todas sus rutas hijas.
//
// La validación se realiza mediante:
//
//   AdminGuard
//
// que consulta:
//
//   /api/auth/autorizacion-administracion
//
// El resto del portal NO pasa por esta validación.
// ============================================================

import {
  ReactNode,
} from "react";

import AdminGuard from "@/components/AdminGuard";

// ============================================================
// TIPOS
// ============================================================

interface AdministracionLayoutProps {
  children: ReactNode;
}

// ============================================================
// COMPONENTE
// ============================================================

export default function AdministracionLayout({
  children,
}: AdministracionLayoutProps) {

  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  );
}