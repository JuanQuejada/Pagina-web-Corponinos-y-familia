"use client";

import { useState } from "react";

import { Eye } from "lucide-react";
import { EyeOff } from "lucide-react";
import { Loader2 } from "lucide-react";

import { cambiarPassword } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";

export default function CambiarPasswordForm(){

  const[password,setPassword]=
    useState("");

  const[confirmar,setConfirmar]=
    useState("");

  const[mostrarPassword,setMostrarPassword]=
    useState(false);

  const[mostrarConfirmar,setMostrarConfirmar]=
    useState(false);

  const[loading,setLoading]=
    useState(false);

  const[error,setError]=
    useState("");

  const router = useRouter();

  async function handleSubmit(
    e:React.FormEvent
  ){

        e.preventDefault();

        setError("");

        if(password.length<6){

            setError(
                "La contraseña debe tener mínimo 6 caracteres."
            );

            return;

        }   

        if(password!==confirmar){

            setError(
                "Las contraseñas no coinciden."
            );

            return;

        }

        setLoading(true);

            const respuesta=
                await cambiarPassword(
                    password
                );

        setLoading(false);

        if(!respuesta.success){

            setError(
                respuesta.error ??
                    "No fue posible cambiar la contraseña."
            );

            return;

        }

    // ==========================================
    // Aquí posteriormente llamaremos auth-server
    // para actualizar:
    //
    // password_cambiada = true
    // ==========================================

    // await actualizarPasswordCambiada();

    router.replace("/dashboard");

  }

  return(

    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      {/* Nueva contraseña */}

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

          Nueva contraseña

        </label>

        <div className="relative">

          <input

            type={
              mostrarPassword
                ? "text"
                : "password"
            }

            value={password}

            onChange={(e)=>
              setPassword(
                e.target.value
              )
            }

            className="
              w-full
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              pr-12
              outline-none
              focus:border-teal-500
            "

          />

          <button

            type="button"

            onClick={()=>

              setMostrarPassword(

                !mostrarPassword

              )

            }

            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
            "

          >

            {

              mostrarPassword

                ?

                <EyeOff size={20}/>

                :

                <Eye size={20}/>

            }

          </button>

        </div>

      </div>

      {/* Confirmar */}

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

          Confirmar contraseña

        </label>

        <div className="relative">

          <input

            type={
              mostrarConfirmar
                ? "text"
                : "password"
            }

            value={confirmar}

            onChange={(e)=>

              setConfirmar(

                e.target.value

              )

            }

            className="
              w-full
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              pr-12
              outline-none
              focus:border-teal-500
            "

          />

          <button

            type="button"

            onClick={()=>

              setMostrarConfirmar(

                !mostrarConfirmar

              )

            }

            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
            "

          >

            {

              mostrarConfirmar

                ?

                <EyeOff size={20}/>

                :

                <Eye size={20}/>

            }

          </button>

        </div>

      </div>

      {/* Error */}

      {

        error && (

          <div
            className="
              rounded-xl
              bg-red-50
              p-3
              text-sm
              text-red-600
            "
          >

            {error}

          </div>

        )

      }

      {/* Botón */}

      <button

        type="submit"

        disabled={loading}

        className="
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-gradient-to-r
          from-teal-600
          to-emerald-600
          py-3.5
          font-semibold
          text-white
          shadow-lg
          transition
          hover:scale-[1.02]
          disabled:opacity-70
        "

      >

        {

          loading

            ?

            <>

              <Loader2 className="h-5 w-5 animate-spin"/>

              Actualizando...

            </>

            :

            "Cambiar contraseña"

        }

      </button>

    </form>

  );

}