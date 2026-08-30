"use client";

// ============================================================
// SELECCIONAR PERFIL
// Portal Corporación Social Niños y Familia
// Selección del perfil de acceso del usuario
// ============================================================

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Check,
  ChevronRight,
  Loader2,
  BriefcaseBusiness,
  ShieldCheck,
  Building2,
  MapPin,
  AlertCircle,
} from "lucide-react";

import type {
  UsuarioAsignacion,
} from "@/types";

import {
  obtenerUsuarioPortal,
  guardarAsignacionSeleccionada,
  limpiarAsignacionSeleccionada,
} from "@/lib/auth/profile";

// ============================================================
// COMPONENTE INTERNO
// ============================================================
//
// IMPORTANTE:
//
// Este componente utiliza useSearchParams().
//
// Por eso NO debe ser el componente exportado directamente
// de la página.
//
// El componente público de abajo lo envuelve mediante
// <Suspense>, requisito de Next.js para la compilación
// de producción.
// ============================================================

function SeleccionarPerfilContenido() {

  const router = useRouter();

  const searchParams =
    useSearchParams();

  // ----------------------------------------------------------
  // ESTADO
  // ----------------------------------------------------------

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    procesando,
    setProcesando,
  ] = useState(false);

  const [
    asignaciones,
    setAsignaciones,
  ] = useState<UsuarioAsignacion[]>([]);

  const [
    seleccionada,
    setSeleccionada,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  // ==========================================================
  // DESTINO
  // ==========================================================

  const destino =
    searchParams.get("redirect") ||
    "/dashboard";

  // ==========================================================
  // CARGAR PERFILES
  // ==========================================================

  useEffect(() => {

    cargarPerfiles();

    // La página se monta una sola vez.
    // El destino se obtiene desde useSearchParams().
    // No necesitamos volver a ejecutar la carga si cambia
    // la referencia del router o de searchParams.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // FUNCIÓN CARGAR PERFILES
  // ==========================================================

  async function cargarPerfiles() {

    try {

      setCargando(true);
      setError(null);

      // ------------------------------------------------------
      // Obtener usuario autenticado
      // ------------------------------------------------------

      const usuario =
        await obtenerUsuarioPortal();

      // ------------------------------------------------------
      // Usuario no autenticado
      // ------------------------------------------------------

      if (!usuario) {

        router.replace(
          `/login?redirect=${encodeURIComponent(destino)}`
        );

        return;
      }

      // ------------------------------------------------------
      // Usuario sin asignaciones
      // ------------------------------------------------------

      if (
        usuario.asignaciones.length === 0
      ) {

        setError(
          "Tu usuario no tiene perfiles de acceso asignados. Comunícate con el administrador del portal."
        );

        return;
      }

      // ------------------------------------------------------
      // Un solo perfil
      //
      // Guardamos la asignación y entramos directamente.
      // ------------------------------------------------------

      if (
        usuario.asignaciones.length === 1
      ) {

        const asignacion =
          usuario.asignaciones[0];

        guardarAsignacionSeleccionada(
          asignacion.id
        );

        router.replace(
          destino
        );

        return;
      }

      // ------------------------------------------------------
      // Varios perfiles
      // ------------------------------------------------------

      setAsignaciones(
        usuario.asignaciones
      );

      // ------------------------------------------------------
      // Si profile.ts ya encontró un perfil activo válido,
      // lo marcamos inicialmente.
      //
      // NO redirigimos automáticamente porque esta pantalla
      // permite cambiar o confirmar el contexto.
      // ------------------------------------------------------

      if (
        usuario.perfilActivo?.asignacion?.id
      ) {

        setSeleccionada(
          usuario.perfilActivo.asignacion.id
        );
      }

    } catch (err) {

      console.error(
        "Error cargando perfiles:",
        err
      );

      setError(
        "No fue posible cargar tus perfiles de acceso."
      );

    } finally {

      setCargando(false);
    }
  }

  // ==========================================================
  // CONFIRMAR PERFIL
  // ==========================================================

  function confirmarPerfil() {

    // --------------------------------------------------------
    // Validar selección
    // --------------------------------------------------------

    if (!seleccionada) {

      setError(
        "Selecciona un perfil para continuar."
      );

      return;
    }

    // --------------------------------------------------------
    // Verificación adicional
    //
    // Comprobamos que la selección pertenezca realmente
    // a las asignaciones cargadas.
    // --------------------------------------------------------

    const asignacion =
      asignaciones.find(
        (item) =>
          item.id === seleccionada
      );

    if (!asignacion) {

      setError(
        "El perfil seleccionado no es válido."
      );

      return;
    }

    try {

      setProcesando(true);
      setError(null);

      // ------------------------------------------------------
      // Guardar asignación activa
      // ------------------------------------------------------

      guardarAsignacionSeleccionada(
        asignacion.id
      );

      // ------------------------------------------------------
      // Navegar al destino solicitado
      // ------------------------------------------------------

      router.replace(
        destino
      );

    } catch (err) {

      console.error(
        "Error seleccionando perfil:",
        err
      );

      setError(
        "No fue posible establecer el perfil seleccionado."
      );

      setProcesando(false);
    }
  }

  // ==========================================================
  // OBTENER NOMBRE DEL CARGO
  // ==========================================================

  function obtenerNombreCargo(
    asignacion: UsuarioAsignacion
  ): string {

    return (
      asignacion.cargo?.nombre ??
      "Cargo no definido"
    );
  }

  // ==========================================================
  // OBTENER NOMBRE DEL ROL
  // ==========================================================

  function obtenerNombreRol(
    asignacion: UsuarioAsignacion
  ): string {

    return (
      asignacion.rol?.nombre ??
      "Rol no definido"
    );
  }

  // ==========================================================
  // OBTENER DEPARTAMENTO
  // ==========================================================

  function obtenerNombreDepartamento(
    asignacion: UsuarioAsignacion
  ): string | null {

    return (
      asignacion
        .cargo
        ?.departamento
        ?.nombre ??
      null
    );
  }

  // ==========================================================
  // OBTENER ÁREA
  // ==========================================================

  function obtenerNombreArea(
    asignacion: UsuarioAsignacion
  ): string | null {

    return (
      asignacion
        .cargo
        ?.departamento
        ?.area
        ?.nombre ??
      null
    );
  }

  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (cargando) {

    return (
      <main
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-50
          dark:bg-slate-950
        "
      >

        <div
          className="
            flex
            flex-col
            items-center
            gap-4
          "
        >

          <Loader2
            className="
              h-10
              w-10
              animate-spin
              text-blue-600
            "
          />

          <p
            className="
              text-sm
              font-medium
              text-gray-500
              dark:text-slate-400
            "
          >
            Cargando tus perfiles...
          </p>

        </div>

      </main>
    );
  }

  // ==========================================================
  // ERROR SIN PERFILES
  // ==========================================================

  if (
    error &&
    asignaciones.length === 0
  ) {

    return (
      <main
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-50
          dark:bg-slate-950
          p-6
        "
      >

        <div
          className="
            w-full
            max-w-md
            rounded-2xl
            border
            border-gray-200
            bg-white
            p-8
            text-center
            shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
          "
        >

          <div
            className="
              mx-auto
              mb-5
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              bg-red-100
              text-red-600
              dark:bg-red-950/50
              dark:text-red-400
            "
          >

            <AlertCircle
              className="h-7 w-7"
            />

          </div>

          <h1
            className="
              text-xl
              font-bold
              text-gray-900
              dark:text-white
            "
          >
            No es posible continuar
          </h1>

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-gray-500
              dark:text-slate-400
            "
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace("/login")
            }
            className="
              mt-6
              w-full
              rounded-xl
              bg-blue-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-700
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              focus:ring-offset-2
              dark:focus:ring-offset-slate-900
            "
          >
            Volver al inicio de sesión
          </button>

        </div>

      </main>
    );
  }

  // ==========================================================
  // VISTA PRINCIPAL
  // ==========================================================

  return (
    <main
      className="
        min-h-screen
        bg-gray-50
        dark:bg-slate-950
      "
    >

      <div
        className="
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-5xl
          items-center
          justify-center
          px-4
          py-10
          sm:px-6
          lg:px-8
        "
      >

        <div
          className="
            w-full
            max-w-3xl
          "
        >

          {/* ==================================================
              ENCABEZADO
          ================================================== */}

          <div
            className="
              mb-8
              text-center
            "
          >

            <div
              className="
                mx-auto
                mb-5
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                bg-blue-100
                text-blue-600
                dark:bg-blue-950/50
                dark:text-blue-400
              "
            >

              <ShieldCheck
                className="h-8 w-8"
              />

            </div>

            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-gray-900
                sm:text-3xl
                dark:text-white
              "
            >
              Selecciona tu perfil
            </h1>

            <p
              className="
                mx-auto
                mt-3
                max-w-xl
                text-sm
                leading-6
                text-gray-500
                sm:text-base
                dark:text-slate-400
              "
            >
              Tu usuario tiene más de un perfil de acceso.
              Selecciona el cargo con el que deseas ingresar
              al portal.
            </p>

          </div>

          {/* ==================================================
              ERROR DE SELECCIÓN
          ================================================== */}

          {error && (
            <div
              className="
                mb-6
                flex
                items-start
                gap-3
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-4
                text-sm
                text-red-700
                dark:border-red-900/50
                dark:bg-red-950/30
                dark:text-red-300
              "
            >

              <AlertCircle
                className="
                  mt-0.5
                  h-5
                  w-5
                  shrink-0
                "
              />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* ==================================================
              PERFILES
          ================================================== */}

          <div
            className="
              grid
              gap-4
              md:grid-cols-2
            "
          >

            {asignaciones.map(
              (
                asignacion
              ) => {

                const activa =
                  seleccionada ===
                  asignacion.id;

                const departamento =
                  obtenerNombreDepartamento(
                    asignacion
                  );

                const area =
                  obtenerNombreArea(
                    asignacion
                  );

                return (
                  <button
                    key={
                      asignacion.id
                    }
                    type="button"
                    disabled={
                      procesando
                    }
                    onClick={() =>
                      setSeleccionada(
                        asignacion.id
                      )
                    }
                    className={`
                      group
                      relative
                      w-full
                      rounded-2xl
                      border
                      p-5
                      text-left
                      transition-all
                      duration-200
                      ${
                        activa
                          ? `
                            border-blue-500
                            bg-blue-50
                            shadow-md
                            ring-2
                            ring-blue-500/20
                            dark:border-blue-500
                            dark:bg-blue-950/30
                          `
                          : `
                            border-gray-200
                            bg-white
                            hover:border-blue-300
                            hover:shadow-md
                            dark:border-slate-800
                            dark:bg-slate-900
                            dark:hover:border-blue-700
                          `
                      }
                      ${
                        procesando
                          ? `
                            cursor-not-allowed
                            opacity-60
                          `
                          : `
                            cursor-pointer
                          `
                      }
                    `}
                  >

                    {/* --------------------------------------
                        CHECK
                    -------------------------------------- */}

                    <div
                      className="
                        absolute
                        right-4
                        top-4
                      "
                    >

                      <div
                        className={`
                          flex
                          h-6
                          w-6
                          items-center
                          justify-center
                          rounded-full
                          border
                          transition
                          ${
                            activa
                              ? `
                                border-blue-600
                                bg-blue-600
                                text-white
                              `
                              : `
                                border-gray-300
                                bg-white
                                text-transparent
                                dark:border-slate-600
                                dark:bg-slate-800
                              `
                          }
                        `}
                      >

                        <Check
                          className="
                            h-4
                            w-4
                          "
                        />

                      </div>

                    </div>

                    {/* --------------------------------------
                        ICONO CARGO
                    -------------------------------------- */}

                    <div
                      className={`
                        mb-4
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        ${
                          activa
                            ? `
                              bg-blue-600
                              text-white
                            `
                            : `
                              bg-gray-100
                              text-gray-600
                              dark:bg-slate-800
                              dark:text-slate-300
                            `
                        }
                      `}
                    >

                      <BriefcaseBusiness
                        className="
                          h-6
                          w-6
                        "
                      />

                    </div>

                    {/* --------------------------------------
                        CARGO
                    -------------------------------------- */}

                    <h2
                      className="
                        pr-8
                        text-base
                        font-bold
                        text-gray-900
                        dark:text-white
                      "
                    >
                      {
                        obtenerNombreCargo(
                          asignacion
                        )
                      }
                    </h2>

                    {/* --------------------------------------
                        ROL
                    -------------------------------------- */}

                    <div
                      className="
                        mt-2
                        flex
                        items-center
                        gap-2
                        text-sm
                        text-gray-600
                        dark:text-slate-300
                      "
                    >

                      <ShieldCheck
                        className="
                          h-4
                          w-4
                          shrink-0
                        "
                      />

                      <span>
                        {
                          obtenerNombreRol(
                            asignacion
                          )
                        }
                      </span>

                    </div>

                    {/* --------------------------------------
                        DEPARTAMENTO
                    -------------------------------------- */}

                    {departamento && (
                      <div
                        className="
                          mt-2
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-gray-500
                          dark:text-slate-400
                        "
                      >

                        <Building2
                          className="
                            h-4
                            w-4
                            shrink-0
                          "
                        />

                        <span>
                          {departamento}
                        </span>

                      </div>
                    )}

                    {/* --------------------------------------
                        ÁREA
                    -------------------------------------- */}

                    {area && (
                      <div
                        className="
                          mt-2
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-gray-500
                          dark:text-slate-400
                        "
                      >

                        <MapPin
                          className="
                            h-4
                            w-4
                            shrink-0
                          "
                        />

                        <span>
                          {area}
                        </span>

                      </div>
                    )}

                    {/* --------------------------------------
                        IDENTIFICADOR
                    -------------------------------------- */}

                    <div
                      className="
                        mt-4
                        border-t
                        border-gray-100
                        pt-3
                        text-[11px]
                        text-gray-400
                        dark:border-slate-800
                        dark:text-slate-500
                      "
                    >
                      Perfil de acceso
                    </div>

                  </button>
                );
              }
            )}

          </div>

          {/* ==================================================
              ACCIONES
          ================================================== */}

          <div
            className="
              mt-8
              flex
              flex-col-reverse
              gap-3
              sm:flex-row
              sm:justify-end
            "
          >

            {/* ------------------------------------------------
                CANCELAR
            ------------------------------------------------ */}

            <button
              type="button"
              disabled={
                procesando
              }
              onClick={() => {

                limpiarAsignacionSeleccionada();

                router.replace(
                  "/login"
                );

              }}
              className="
                rounded-xl
                border
                border-gray-200
                bg-white
                px-5
                py-3
                text-sm
                font-semibold
                text-gray-700
                transition
                hover:bg-gray-50
                dark:border-slate-800
                dark:bg-slate-900
                dark:text-slate-300
                dark:hover:bg-slate-800
              "
            >
              Cancelar
            </button>

            {/* ------------------------------------------------
                CONTINUAR
            ------------------------------------------------ */}

            <button
              type="button"
              disabled={
                !seleccionada ||
                procesando
              }
              onClick={
                confirmarPerfil
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-6
                py-3
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-50
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-2
                dark:focus:ring-offset-slate-950
              "
            >

              {procesando ? (

                <>
                  <Loader2
                    className="
                      h-4
                      w-4
                      animate-spin
                    "
                  />

                  Estableciendo perfil...
                </>

              ) : (

                <>
                  Continuar

                  <ChevronRight
                    className="
                      h-4
                      w-4
                    "
                  />

                </>

              )}

            </button>

          </div>

        </div>

      </div>

    </main>
  );
}

// ============================================================
// FALLBACK DE SUSPENSE
// ============================================================

function SeleccionarPerfilLoading() {

  return (
    <main
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-gray-50
        dark:bg-slate-950
      "
    >

      <div
        className="
          flex
          flex-col
          items-center
          gap-4
        "
      >

        <Loader2
          className="
            h-10
            w-10
            animate-spin
            text-blue-600
          "
        />

        <p
          className="
            text-sm
            font-medium
            text-gray-500
            dark:text-slate-400
          "
        >
          Cargando selección de perfil...
        </p>

      </div>

    </main>
  );
}

// ============================================================
// PÁGINA
// ============================================================
//
// Next.js 16 requiere que useSearchParams() esté contenido
// dentro de un Suspense Boundary durante el prerender/build.
// ============================================================

export default function SeleccionarPerfilPage() {

  return (
    <Suspense
      fallback={
        <SeleccionarPerfilLoading />
      }
    >
      <SeleccionarPerfilContenido />
    </Suspense>
  );
}