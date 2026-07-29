// ============================================================
// UTILIDADES GLOBALES
// Portal Corporativo - CSNiños y Familia
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Usuario } from "@/types";

// ============================================================
// TAILWIND
// Une clases de Tailwind evitando duplicados.
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// TEXTO
// ============================================================

export function capitalizar(texto?: string | null): string {
  if (!texto) return "";

  return texto
    .toLowerCase()
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

export function limpiarEspacios(texto?: string | null): string {
  if (!texto) return "";

  return texto.trim().replace(/\s+/g, " ");
}

export function quitarTildes(texto?: string | null): string {
  if (!texto) return "";

  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generarSlug(texto?: string | null): string {
  if (!texto) return "";

  return quitarTildes(texto)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

// ============================================================
// VALIDACIONES BÁSICAS
// ============================================================

export function estaVacio(valor: unknown): boolean {

  if (valor === null) return true;

  if (valor === undefined) return true;

  if (typeof valor === "string")
    return valor.trim() === "";

  if (Array.isArray(valor))
    return valor.length === 0;

  return false;
}

// ============================================================
// USUARIOS
// ============================================================

export function obtenerNombreUsuario(
  usuario?: Usuario | null
): string {

  if (!usuario) return "Usuario";

  if (usuario.tipo_persona_id === "natural") {

    const nombre = `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim();

    return nombre || "Usuario";

  }

  return usuario.razon_social ?? "Persona Jurídica";

}

// ============================================================

export function obtenerNombreCompleto(
  usuario?: Usuario | null
): string {

  if (!usuario) return "";

  if (usuario.tipo_persona_id === "natural") {

    return `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim();

  }

  return usuario.razon_social ?? "";

}

// ============================================================

export function obtenerIniciales(
  usuario?: Usuario | null
): string {

  if (!usuario) return "U";

  // Persona Natural

  if (usuario.tipo_persona_id === "natural") {

    const nombres = usuario.nombres?.trim().split(" ") ?? [];

    const apellidos = usuario.apellidos?.trim().split(" ") ?? [];

    const inicialNombre = nombres[0]?.charAt(0) ?? "";

    const inicialApellido = apellidos[0]?.charAt(0) ?? "";

    const iniciales =
      `${inicialNombre}${inicialApellido}`.toUpperCase();

    return iniciales || "U";

  }

  // Persona Jurídica

  const palabras =
    usuario.razon_social
      ?.trim()
      .split(" ")
      .filter(Boolean) ?? [];

  if (palabras.length === 0)
    return "PJ";

  if (palabras.length === 1)
    return palabras[0].substring(0, 2).toUpperCase();

  return (
    palabras[0].charAt(0) +
    palabras[1].charAt(0)
  ).toUpperCase();

}

// ============================================================

export function obtenerAvatarTexto(
  usuario?: Usuario | null
): string {

  return obtenerIniciales(usuario);

}

// ============================================================

export function obtenerCargoPrincipal(
  usuario?: Usuario | null
): string {

  if (!usuario)
    return "Sin cargo";

  return usuario.cargo ?? "Asignado al área";

}

// ============================================================

export function obtenerAreaPrincipal(
  usuario?: Usuario | null
): string {

  if (!usuario)
    return "Sin área";

  return usuario.area?.nombre ?? "Sin área";

}

// ============================================================

export function obtenerDepartamentoPrincipal(
  usuario?: Usuario | null
): string {

  if (!usuario)
    return "";

  return usuario.departamento?.nombre ?? "";

}

// ============================================================

export function obtenerDocumento(
  usuario?: Usuario | null
): string {

  if (!usuario)
    return "";

  if (
    !usuario.tipoIdentificacion ||
    !usuario.numero_identificacion
  ) {
    return "";
  }

  return `${usuario.tipoIdentificacion} ${usuario.numero_identificacion}`;

}

// ============================================================

export function obtenerNombreVisual(
  usuario?: Usuario | null
): string {

  return obtenerNombreUsuario(usuario);

}

// ============================================================
// COLOR DEL AVATAR
// ============================================================

const coloresAvatar = [
  "linear-gradient(135deg,#0F766E,#14B8A6)",
  "linear-gradient(135deg,#2563EB,#3B82F6)",
  "linear-gradient(135deg,#7C3AED,#8B5CF6)",
  "linear-gradient(135deg,#EA580C,#F97316)",
  "linear-gradient(135deg,#BE123C,#F43F5E)",
  "linear-gradient(135deg,#15803D,#22C55E)",
  "linear-gradient(135deg,#4338CA,#6366F1)",
  "linear-gradient(135deg,#374151,#6B7280)",
];

export function obtenerColorAvatar(
  id?: string | null
): string {

  if (!id) {
    return coloresAvatar[0];
  }

  let hash = 0;

  for (let i = 0; i < id.length; i++) {

    hash =
      id.charCodeAt(i) +
      ((hash << 5) - hash);

  }

  return coloresAvatar[
    Math.abs(hash) % coloresAvatar.length
  ];

}