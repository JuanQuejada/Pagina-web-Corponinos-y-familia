"use client";

// ============================================================
// LOGIN CARD
// Portal Corporación Social Niños y Familia
// ============================================================

import Image from "next/image";
import { useRouter } from "next/navigation";

import LoginForm from "./LoginForm";

import { login } from "@/lib/auth/auth-client";
import { useAuth } from "@/context/AuthContext";
import { limpiarAsignacionSeleccionada } from "@/lib/auth/profile";

export default function LoginCard() {
  const router = useRouter();
  const { actualizarSesion } = useAuth();

  async function handleLogin(
    email: string,
    password: string
  ): Promise<void> {
    const resultado = await login(email, password);

    if (!resultado.success) {
      throw new Error(
        resultado.error ?? "No fue posible iniciar sesión."
      );
    }

    // ----------------------------------------------------------
    // NUEVO INICIO DE SESIÓN = NUEVA SELECCIÓN DE PERFIL
    // ----------------------------------------------------------
    // Evitamos reutilizar accidentalmente el cargo seleccionado
    // por otra sesión del mismo navegador.
    // ----------------------------------------------------------
    limpiarAsignacionSeleccionada();

    // También eliminamos la selección de servidor anterior.
    await fetch("/api/auth/seleccionar-perfil", {
      method: "DELETE",
      cache: "no-store",
    }).catch(() => undefined);

    // Cargamos la sesión base de AuthContext.
    await actualizarSesion();

    // ----------------------------------------------------------
    // SIEMPRE pasamos por el selector.
    //
    // seleccionar-perfil redirige automáticamente al dashboard
    // cuando solo existe una asignación activa.
    // ----------------------------------------------------------
    router.replace("/seleccionar-perfil?redirect=/dashboard");
  }

  return (
    <div
      className="
        w-full
        max-w-md
        rounded-3xl
        border
        border-white/40
        bg-white/85
        p-8
        shadow-2xl
        backdrop-blur-xl
      "
    >
      <div className="flex justify-center">
        <Image
          src="/images/branding/logo-corporacion.png"
          alt="Corporación Social Niños y Familia"
          width={95}
          height={95}
          priority
        />
      </div>

      <h1
        className="
          mt-6
          text-center
          text-3xl
          font-bold
          text-slate-800
        "
      >
        Bienvenido
      </h1>

      <p
        className="
          mt-2
          text-center
          text-xl
          text-slate-500
        "
      >
        PORTAL CORPORATIVO
      </p>

      <div className="mt-8">
        <LoginForm onLogin={handleLogin} />
      </div>

      <div
        className="
          mt-8
          border-t
          border-slate-200
          pt-6
        "
      >
        <p
          className="
            text-center
            text-xs
            text-slate-500
          "
        >
          Portal de Gestión Documental Integral
        </p>

        <p
          className="
            mt-2
            text-center
            text-[11px]
            text-slate-400
          "
        >
          © {new Date().getFullYear()} Corporación Social Niños y Familia
        </p>
      </div>
    </div>
  );
}
