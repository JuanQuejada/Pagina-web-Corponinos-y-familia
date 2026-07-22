"use client";

import Image from "next/image";
import LoginForm from "./LoginForm";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginCard() {

  //------------------------------------------------------

const router = useRouter();

async function handleLogin(
  email: string,
  password: string
) {

  await new Promise(resolve =>
    setTimeout(resolve, 800)
  );

  if (
    email === "admin@corponinos.org" &&
    password === "123456"
  ) {

    const usuarioDemo = {

      id: "1",
      email,
      tipo_persona: "juridica",
      razon_social: "Departamento Sistemas",
      nombres: null,
      apellidos: null,
      tipo_usuario: "Ejecutivo",
      cargo: "Ingeniero de Sistemas",
      foto_url: null,
      perfil_completo: true,
      tipo_documento:"NIT",
      numero_documento:"123456789",
      telefono: "3100001234",
      direccion: "Cll 1 # 10 - 00",

      rol: {
        nombre: "Super Administrador",
        nivel: 1,
      },

      area: {
        nombre: "Dirección General",
      },

      departamento: {
        nombre: "Administración",
      },

      fecha: {
        nombre: "05/01/2026",
      },

    };

    localStorage.setItem(
      "token",
      "demo-token"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuarioDemo)
    );

    router.push("/dashboard");

    return;

  }

  throw new Error(
    "Correo o contraseña incorrectos."
  );

}
  //------------------------------------------------------

  return(

    <div
      className="
      w-full
      max-w-md
      rounded-3xl
      border
      border-white/40
      bg-white/85
      backdrop-blur-xl
      shadow-2xl
      p-8
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

      <div className="mt-8 border-t border-slate-200 pt-6">

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