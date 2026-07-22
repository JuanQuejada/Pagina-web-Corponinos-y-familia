"use client";

import Image from "next/image";
import RecuperarPasswordForm from "./RecuperarPasswordForm";

export default function RecuperarPasswordCard(){

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

        Recuperar contraseña

      </h1>

      <p
        className="
        mt-3
        text-center
        text-sm
        leading-6
        text-slate-500
        "
      >

        Ingresa el correo electrónico registrado en el portal.
        Te enviaremos un enlace para restablecer tu contraseña.

      </p>

      <div className="mt-8">

        <RecuperarPasswordForm/>

      </div>

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