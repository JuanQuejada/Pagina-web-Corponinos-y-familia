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

export default function LoginCard() {

  // ==========================================================
  // Hooks
  // ==========================================================

  const router = useRouter();

  const {
    actualizarSesion,
  } = useAuth();

  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleLogin(
    email: string,
    password: string
  ): Promise<void> {

    //----------------------------------------------------------
    // Autenticar con Supabase
    //----------------------------------------------------------

    const resultado =
      await login(
        email,
        password
      );

    if (!resultado.success) {

      throw new Error(

        resultado.error ??

        "No fue posible iniciar sesión."

      );

    }

    //----------------------------------------------------------
    // Actualizar sesión del Portal
    //----------------------------------------------------------

    await actualizarSesion();

    //----------------------------------------------------------
    // Redireccionar
    //----------------------------------------------------------

    router.replace("/dashboard");

  }

  // ==========================================================
  // COMPONENTE
  // ==========================================================

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

      {/* Logo */}

      <div className="flex justify-center">

        <Image
          src="/images/branding/logo-corporacion.png"
          alt="Corporación Social Niños y Familia"
          width={95}
          height={95}
          priority
        />

      </div>

      {/* Título */}

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

      {/* Formulario */}

      <div className="mt-8">

        <LoginForm
          onLogin={handleLogin}
        />

      </div>

      {/* Footer */}

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