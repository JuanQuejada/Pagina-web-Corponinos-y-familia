"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import type {
  UsuarioPortal,
} from "@/types";

import {
  obtenerSesionPortal,
  cerrarSesion as cerrarSesionPortal,
} from "@/lib/auth/session";

// ============================================================
// CONTEXTO
// ============================================================

interface AuthContextType {
  usuarioPortal: UsuarioPortal | null;
  cargando: boolean;
  autenticado: boolean;
  actualizarSesion: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  // 1. Agrega la propiedad aquí para que TypeScript la reconozca
  actualizarDatosUsuario: (nuevosDatos: Partial<UsuarioPortal>) => void; 
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [
    usuarioPortal,
    setUsuarioPortal,
  ] = useState<UsuarioPortal | null>(
    null
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  // ==========================================================
  // ACTUALIZAR SESIÓN
  // ==========================================================

  async function actualizarSesion() {
    setCargando(true);

    const respuesta =
      await obtenerSesionPortal();

    if (
      respuesta.success &&
      respuesta.data
    ) {
      setUsuarioPortal(
        respuesta.data.usuario
      );
    } else {
      setUsuarioPortal(null);
    }

    setCargando(false);
  }

  // ==========================================================
  // ACTUALIZAR DATOS LOCALES DEL USUARIO (NUEVO)
  // ==========================================================
  
  // 2. Implementa la función por si quieres refrescar o modificar datos en caliente
  function actualizarDatosUsuario(nuevosDatos: Partial<UsuarioPortal>) {
    setUsuarioPortal((prev) => {
      if (!prev) return null;
      return { ...prev, ...nuevosDatos };
    });
  }

  // ==========================================================
  // CARGAR SESIÓN AL INICIAR
  // ==========================================================

  useEffect(() => {
    actualizarSesion();
  }, []);

  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  async function cerrarSesion() {
    await cerrarSesionPortal();
    setUsuarioPortal(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuarioPortal,
        cargando,
        autenticado:
          usuarioPortal !== null,
        actualizarSesion,
        cerrarSesion,
        // 3. Exponla en el value del Provider
        actualizarDatosUsuario, 
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de un AuthProvider."
    );
  }

  return context;
}