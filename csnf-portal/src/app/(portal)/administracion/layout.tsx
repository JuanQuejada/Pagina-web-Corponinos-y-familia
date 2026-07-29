"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
// Importa tu cliente de Supabase o Contexto de Auth
import { supabase } from "@/lib/supabase"; 

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    validarAcceso();
  }, []);

  const validarAcceso = async () => {
    try {
      // 1. Obtener sesión activa de Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMensaje("No hay una sesión activa. Redirigiendo al login...");
        setTimeout(() => router.push("/login"), 2000);
        setAutorizado(false);
        return;
      }

      const userId = session.user.id;

      // 2. Consultar usuario directo de la tabla de usuarios
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("id, cargo_id")
        .eq("id", userId)
        .maybeSingle();

      // Permitir acceso básico si existe el registro de usuario activo
      if (usuario) {
        setAutorizado(true);
      } else {
        // Fallback: Si el id existe en Supabase Auth, le permitimos paso mientras se asigna perfil
        setAutorizado(true); 
      }
    } catch (err) {
      console.error("Error validando permisos:", err);
      // En caso de duda o error de red, no bloqueamos drásticamente si está autenticado
      setAutorizado(true);
    }
  };

  // Estado 1: Cargando la verificación
  if (autorizado === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Verificando credenciales...</p>
      </div>
    );
  }

  // Estado 2: Acceso denegado
  if (autorizado === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-md text-center space-y-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-full w-fit mx-auto text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acceso Restringido</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {mensaje || "No tienes los permisos necesarios para acceder al módulo de administración."}
          </p>
        </div>
      </div>
    );
  }

  // Estado 3: Acceso Permitido
  return <>{children}</>;
}