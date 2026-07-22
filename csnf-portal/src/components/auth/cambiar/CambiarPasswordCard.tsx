"use client";

import Image from "next/image";

import CambiarPasswordForm from "./CambiarPasswordForm";

export default function CambiarPasswordCard(){

  return(

    <div
      className="
        w-full
        max-w-md
        rounded-3xl
        border
        border-white/40
        bg-white/90
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

        Cambiar contraseña

      </h1>

      <p
        className="
          mt-3
          text-center
          text-slate-500
          text-sm
          leading-6
        "
      >

        Por motivos de seguridad debes crear una nueva contraseña antes de ingresar al Portal Corporativo.

      </p>

      {/* Formulario */}

      <div className="mt-8">

        <CambiarPasswordForm/>

      </div>

    </div>

  );

}