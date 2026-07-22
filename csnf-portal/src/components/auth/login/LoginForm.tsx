"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { login } from "@/lib/auth/auth-client";

interface LoginFormProps {
  onLogin: (
    email: string,
    password: string
  ) => Promise<void>;
}

export default function LoginForm({
  onLogin,
}: LoginFormProps) {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  //------------------------------------------------------

  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    setError("");

    if (!email.trim()) {

      setError(
        "Debe ingresar el correo electrónico."
      );

      return;

    }

    if (!password.trim()) {

      setError(
        "Debe ingresar la contraseña."
      );

      return;

    }

    try {

      setLoading(true);

      await onLogin(
        email,
        password
      );

    } catch (err:any) {

      setError(
        err?.message ??
        "No fue posible iniciar sesión."
      );

    } finally {

      setLoading(false);

    }

  }

  //------------------------------------------------------

  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      {/* Correo */}

      <div>

        <label className="mb-2 block text-sm font-medium text-slate-700">

          Correo electrónico

        </label>

        <div className="relative">

          <Mail
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />

          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e)=>
              setEmail(e.target.value)
            }
            placeholder="usuario@corporacion.org.co"
            className="
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              py-3
              pl-12
              pr-4
              outline-none
              transition
              focus:border-teal-600
            "
          />

        </div>

      </div>

      {/* Contraseña */}

      <div>

        <label className="mb-2 block text-sm font-medium text-slate-700">

          Contraseña

        </label>

        <div className="relative">

          <Lock
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />

          <input
            type={
              mostrarPassword
                ? "text"
                : "password"
            }
            value={password}
            onChange={(e)=>
              setPassword(e.target.value)
            }
            placeholder="Ingrese su contraseña"
            className="
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              py-3
              pl-12
              pr-12
              outline-none
              transition
              focus:border-teal-600
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
              right-4
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          >

            {mostrarPassword
              ? <EyeOff className="h-5 w-5"/>
              : <Eye className="h-5 w-5"/>
            }

          </button>

        </div>

      </div>
            {/* Mensaje de error */}

            {error && (

<div
  className="
    rounded-xl
    border
    border-red-200
    bg-red-50
    px-4
    py-3
    text-sm
    text-red-600
  "
>

  {error}

</div>

)}

{/* Recuperar contraseña */}

<div className="flex justify-end">

  <Link
    href="/recuperar-password"
    className="
      text-sm
      font-medium
      text-teal-700
      transition
      hover:text-teal-800
      hover:underline
    "
  >

    ¿Olvidó su contraseña?

  </Link>

</div>

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
  text-base
  font-semibold
  text-white
  shadow-lg
  transition-all
  duration-300
  hover:scale-[1.02]
  hover:shadow-xl
  disabled:cursor-not-allowed
  disabled:opacity-70
  disabled:hover:scale-100
"
>

{loading ? (

  <>

    <Loader2 className="h-5 w-5 animate-spin" />

    Iniciando sesión...

  </>

) : (

  "Iniciar sesión"

)}

</button>

</form>

);

}