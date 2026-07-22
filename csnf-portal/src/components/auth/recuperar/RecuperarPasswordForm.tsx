"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { recuperarPassword } from "@/lib/auth/auth-client";

export default function RecuperarPasswordForm(){

  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);
  const [enviado,setEnviado]=useState(false);
  const [error,setError]=useState("");

  async function handleSubmit(
    e:React.FormEvent<HTMLFormElement>
  ){

    e.preventDefault();

    setError("");

    if(!email.trim()){

      setError(
        "Ingresa tu correo electrónico."
      );

      return;

    }

    setLoading(true);

    try{

      const respuesta=
        await recuperarPassword(email);

      if(!respuesta.success){

        throw new Error(
          respuesta.error
      );

}

setEnviado(true);

    }catch{

      setError(
        "No fue posible enviar el enlace."
      );

    }finally{

      setLoading(false);

    }

  }

  if(enviado){

    return(

      <div className="space-y-6">

        <div
          className="
          rounded-2xl
          border
          border-emerald-200
          bg-emerald-50
          p-5
          text-center
          "
        >

          <h3
            className="
            text-lg
            font-semibold
            text-emerald-700
            "
          >

            Correo enviado

          </h3>

          <p
            className="
            mt-2
            text-sm
            text-emerald-600
            "
          >

            Si el correo se encuentra registrado,
            recibirás un enlace para restablecer tu contraseña.

          </p>

        </div>

        <Link
          href="/login"
          className="
          flex
          h-12
          items-center
          justify-center
          rounded-xl
          border
          border-slate-300
          font-medium
          text-slate-700
          transition
          hover:bg-slate-100
          "
        >

          Volver al inicio de sesión

        </Link>

      </div>

    );

  }

  return(

    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >

      <div>

        <label
          className="
          mb-2
          block
          text-sm
          font-medium
          text-slate-700
          "
        >

          Correo electrónico

        </label>

        <div className="relative">

          <Mail
            className="
            absolute
            left-4
            top-1/2
            h-5
            w-5
            -translate-y-1/2
            text-slate-400
            "
          />

          <input
            type="email"
            value={email}
            onChange={e=>
              setEmail(e.target.value)
            }
            placeholder="correo@corponinos.org"
            className="
            h-12
            w-full
            rounded-xl
            border
            border-slate-300
            bg-white
            pl-12
            pr-4
            outline-none
            transition
            focus:border-teal-600
            "
          />

        </div>

        {error &&(

          <p
            className="
            mt-2
            text-sm
            text-red-600
            "
          >

            {error}

          </p>

        )}

      </div>

      <button
        type="submit"
        disabled={loading}
        className="
        flex
        h-12
        w-full
        items-center
        justify-center
        rounded-xl
        bg-teal-600
        font-semibold
        text-white
        transition
        hover:bg-teal-700
        disabled:cursor-not-allowed
        disabled:opacity-70
        "
      >

        {loading?(
          <>
            <Loader2
              className="
              mr-2
              h-5
              w-5
              animate-spin
              "
            />
            Enviando...
          </>
        ):(
          "Enviar enlace"
        )}

      </button>

      <Link
        href="/login"
        className="
        block
        text-center
        text-sm
        text-teal-700
        hover:underline
        "
      >

        Volver al inicio de sesión

      </Link>

    </form>

  );

}