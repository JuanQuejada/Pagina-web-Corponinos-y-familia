"use client";

// ============================================================
// ADMIN GUARD
// Portal Corporación Social Niños y Familia
//
// RESPONSABILIDAD:
//
// Protege exclusivamente las rutas de Administración.
//
// Este componente:
//
// 1. Verifica que exista una sesión Supabase.
// 2. Obtiene el perfil activo desde sessionStorage.
// 3. Utiliza la misma clave que profile.ts:
//
//      csnf_perfil_activo
//
// 4. Envía el ID de asignación a:
//
//      /api/auth/autorizacion-administracion
//
// 5. La API vuelve a validar:
//
//      - usuario
//      - asignación
//      - cargo
//      - rol
//      - estado del rol
//      - estado del cargo
//      - nivel administrativo
//      - permisos
//
// IMPORTANTE:
//
// sessionStorage NO es una fuente de confianza.
//
// El valor almacenado únicamente identifica qué perfil
// seleccionó el usuario.
//
// La autorización real SIEMPRE corresponde al servidor.
// ============================================================

import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Loader2,
  ShieldAlert,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

// ============================================================
// CONSTANTES
// ============================================================

const CLAVE_PERFIL_ACTIVO =
  "csnf_perfil_activo";

const RUTA_LOGIN =
  "/login";

const RUTA_SELECCION_PERFIL =
  "/seleccionar-perfil";

// ============================================================
// TIPOS
// ============================================================

interface AutorizacionPerfil {
  asignacion_id: string;

  cargo_id: string;

  cargo_nombre: string | null;

  rol_id: string;

  rol_codigo: string | null;

  rol_nombre: string | null;

  rol_nivel: number;
}

interface AutorizacionResponse {
  success: boolean;

  autorizado: boolean;

  es_admin?: boolean;

  es_super_admin?: boolean;

  usuario_id?: string;

  perfil?: AutorizacionPerfil;

  permisos?: Record<string, string[]>;

  permisos_codigos?: string[];

  requiere_seleccion_perfil?: boolean;

  motivo?: string;

  error?: string;

  total_asignaciones?: number;
}

// ============================================================
// PROPS
// ============================================================

interface AdminGuardProps {
  children: ReactNode;
}

// ============================================================
// OBTENER ASIGNACIÓN ACTIVA
// ============================================================
//
// profile.ts guarda:
//
//   sessionStorage.setItem(
//     "csnf_perfil_activo",
//     asignacionId
//   );
//
// Por lo tanto NO debemos hacer JSON.parse().
//
// El valor esperado es directamente:
//
//   "UUID-DE-LA-ASIGNACION"
// ============================================================

function obtenerAsignacionActiva():
  string | null {

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {

    const valor =
      sessionStorage.getItem(
        CLAVE_PERFIL_ACTIVO
      );

    if (
      !valor ||
      typeof valor !== "string"
    ) {
      return null;
    }

    const asignacionId =
      valor.trim();

    if (!asignacionId) {
      return null;
    }

    return asignacionId;

  } catch (error) {

    console.warn(
      "No fue posible obtener el perfil activo desde sessionStorage:",
      error
    );

    return null;
  }
}

// ============================================================
// LIMPIAR ASIGNACIÓN ACTIVA
// ============================================================

function limpiarAsignacionActiva():
  void {

  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {

    sessionStorage.removeItem(
      CLAVE_PERFIL_ACTIVO
    );

  } catch (error) {

    console.warn(
      "No fue posible limpiar el perfil activo:",
      error
    );
  }
}

// ============================================================
// COMPONENTE
// ============================================================

export default function AdminGuard({
  children,
}: AdminGuardProps) {

  const router =
    useRouter();

  const pathname =
    usePathname();

  // ----------------------------------------------------------
  // AUTORIZACIÓN
  //
  // null  = todavía verificando
  // true  = autorizado
  // false = rechazado
  // ----------------------------------------------------------

  const [
    autorizado,
    setAutorizado,
  ] = useState<boolean | null>(
    null
  );

  // ----------------------------------------------------------
  // MENSAJE DE ERROR
  // ----------------------------------------------------------

  const [
    mensaje,
    setMensaje,
  ] = useState<string | null>(
    null
  );

  // ==========================================================
  // VALIDAR ACCESO
  // ==========================================================

  const validarAcceso =
    useCallback(async () => {

      try {

        // ----------------------------------------------------
        // Estado inicial
        // ----------------------------------------------------

        setAutorizado(null);

        setMensaje(null);

        // ====================================================
        // 1. OBTENER SESIÓN SUPABASE
        // ====================================================

        const {
          data: {
            session,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        // ----------------------------------------------------
        // Error obteniendo sesión
        // ----------------------------------------------------

        if (sessionError) {

          console.error(
            "Error obteniendo sesión:",
            sessionError
          );

          setMensaje(
            "No fue posible verificar la sesión actual."
          );

          setAutorizado(false);

          return;
        }

        // ====================================================
        // 2. VALIDAR SESIÓN
        // ====================================================

        if (
          !session ||
          !session.access_token
        ) {

          setMensaje(
            "No hay una sesión activa. Redirigiendo al inicio de sesión..."
          );

          setAutorizado(false);

          setTimeout(() => {

            router.replace(
              RUTA_LOGIN
            );

          }, 500);

          return;
        }

        // ====================================================
        // 3. OBTENER PERFIL ACTIVO
        // ====================================================
        //
        // IMPORTANTE:
        //
        // profile.ts utiliza:
        //
        //   csnf_perfil_activo
        //
        // y guarda directamente el ID:
        //
        //   sessionStorage.setItem(
        //     "csnf_perfil_activo",
        //     asignacionId
        //   );
        //
        // Por eso aquí NO usamos JSON.parse().
        // ====================================================

        const asignacionId =
          obtenerAsignacionActiva();

        // ====================================================
        // 4. LLAMAR API DE AUTORIZACIÓN
        // ====================================================

        const body =
          asignacionId
            ? {
                asignacion_id:
                  asignacionId,
              }
            : {};

        const response =
          await fetch(
            "/api/auth/autorizacion-administracion",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify(body),
            }
          );

        // ====================================================
        // 5. LEER RESPUESTA
        // ====================================================

        let resultado:
          AutorizacionResponse;

        try {

          resultado =
            await response.json();

        } catch (error) {

          console.error(
            "La API de autorización devolvió una respuesta no válida:",
            error
          );

          setMensaje(
            `El servidor devolvió una respuesta no válida. Código HTTP: ${response.status}.`
          );

          setAutorizado(false);

          return;
        }

        // ====================================================
        // 6. PERFIL REQUERIDO
        // ====================================================
        //
        // La API devuelve este estado cuando existen varias
        // asignaciones activas y no se proporcionó una válida.
        //
        // En ese caso enviamos al selector.
        // ====================================================

        if (
          resultado.motivo ===
            "SELECCION_PERFIL_REQUERIDA" ||
          resultado.requiere_seleccion_perfil ===
            true
        ) {

          // --------------------------------------------------
          // Evitar redirección si ya estamos en el selector.
          // --------------------------------------------------

          if (
            pathname !==
            RUTA_SELECCION_PERFIL
          ) {

            router.replace(
              `${RUTA_SELECCION_PERFIL}?redirect=${encodeURIComponent(
                pathname || "/administracion"
              )}`
            );

          }

          return;
        }

        // ====================================================
        // 7. SESIÓN EXPIRADA
        // ====================================================

        if (
          response.status === 401
        ) {

          limpiarAsignacionActiva();

          setMensaje(
            "La sesión ha expirado. Redirigiendo al inicio de sesión..."
          );

          setAutorizado(false);

          setTimeout(() => {

            router.replace(
              RUTA_LOGIN
            );

          }, 500);

          return;
        }

        // ====================================================
        // 8. AUTORIZACIÓN RECHAZADA
        // ====================================================

        if (
          !response.ok ||
          !resultado.autorizado
        ) {

          console.warn(
            "Acceso administrativo rechazado:",
            {
              status:
                response.status,

              motivo:
                resultado.motivo,

              error:
                resultado.error,
            }
          );

          // --------------------------------------------------
          // La asignación dejó de ser válida.
          //
          // Ejemplos:
          //
          // - ya no pertenece al usuario
          // - fue desactivada
          // - rol inactivo
          // - cargo inactivo
          //
          // Limpiamos la selección para evitar que quede
          // atrapado en un perfil inválido.
          // --------------------------------------------------

          if (
            resultado.motivo ===
              "ASIGNACION_NO_PERTENECE_USUARIO" ||

            resultado.motivo ===
              "ASIGNACION_INVALIDA" ||

            resultado.motivo ===
              "SIN_ASIGNACION" ||

            resultado.motivo ===
              "ROL_INACTIVO" ||

            resultado.motivo ===
              "CARGO_INACTIVO"
          ) {

            limpiarAsignacionActiva();
          }

          // --------------------------------------------------
          // Si necesita seleccionar nuevamente un perfil.
          // --------------------------------------------------

          if (
            resultado.motivo ===
            "SELECCION_PERFIL_REQUERIDA"
          ) {

            limpiarAsignacionActiva();

            router.replace(
              `${RUTA_SELECCION_PERFIL}?redirect=${encodeURIComponent(
                pathname || "/administracion"
              )}`
            );

            return;
          }

          // --------------------------------------------------
          // Mostrar rechazo.
          // --------------------------------------------------

          setMensaje(
            resultado.error ||
              "No tienes autorización para acceder al módulo de administración."
          );

          setAutorizado(false);

          return;
        }

        // ====================================================
        // 9. VALIDAR RESPUESTA AUTORIZADA
        // ====================================================

        if (
          resultado.autorizado === true
        ) {

          // --------------------------------------------------
          // La API ya verificó la seguridad.
          //
          // No necesitamos volver a calcular:
          //
          // - nivel
          // - rol
          // - cargo
          // - permisos
          //
          // El servidor es la autoridad.
          // --------------------------------------------------

          if (
            !resultado.perfil
          ) {

            console.error(
              "La API indicó autorización pero no devolvió el perfil."
            );

            setMensaje(
              "El servidor devolvió una respuesta de autorización incompleta."
            );

            setAutorizado(false);

            return;
          }

          // --------------------------------------------------
          // Confirmar que el perfil autorizado coincide con
          // el perfil solicitado.
          // --------------------------------------------------

          if (
            asignacionId &&
            resultado.perfil.asignacion_id !==
              asignacionId
          ) {

            console.error(
              "La API autorizó una asignación diferente a la solicitada.",
              {
                solicitada:
                  asignacionId,

                autorizada:
                  resultado.perfil
                    .asignacion_id,
              }
            );

            limpiarAsignacionActiva();

            setMensaje(
              "El perfil activo no coincide con el perfil autorizado por el servidor."
            );

            setAutorizado(false);

            return;
          }

          // --------------------------------------------------
          // Mantener la selección sincronizada.
          //
          // Solamente guardamos el ID.
          //
          // NO almacenamos un objeto JSON.
          // --------------------------------------------------

          if (
            typeof window !==
            "undefined"
          ) {

            try {

              sessionStorage.setItem(
                CLAVE_PERFIL_ACTIVO,

                resultado.perfil
                  .asignacion_id
              );

            } catch (error) {

              console.warn(
                "No fue posible actualizar el perfil activo:",
                error
              );
            }
          }

          // --------------------------------------------------
          // AUTORIZADO
          // --------------------------------------------------

          setAutorizado(true);

          return;
        }

        // ====================================================
        // 10. RESPUESTA INCONSISTENTE
        // ====================================================

        console.error(
          "Respuesta inconsistente de la API de autorización:",
          resultado
        );

        setMensaje(
          "El servidor devolvió una respuesta de autorización incompleta."
        );

        setAutorizado(false);

      } catch (error) {

        // ====================================================
        // ERROR GENERAL
        // ====================================================

        console.error(
          "Error validando autorización administrativa:",
          error
        );

        // ----------------------------------------------------
        // NUNCA autorizamos cuando existe un error.
        // ----------------------------------------------------

        setMensaje(
          "No fue posible verificar la autorización administrativa."
        );

        setAutorizado(false);
      }

    }, [
      pathname,
      router,
    ]);

  // ==========================================================
  // EJECUTAR VALIDACIÓN
  // ==========================================================

  useEffect(() => {

    validarAcceso();

  }, [
    validarAcceso,
  ]);

  // ==========================================================
  // ESTADO 1
  // VERIFICANDO
  // ==========================================================

  if (
    autorizado === null
  ) {

    return (
      <div
        className="
          min-h-screen
          flex
          flex-col
          items-center
          justify-center
          gap-3
          bg-slate-50
          dark:bg-slate-950
        "
      >

        <Loader2
          className="
            h-8
            w-8
            animate-spin
            text-teal-600
          "
        />

        <p
          className="
            text-sm
            font-medium
            text-slate-500
            dark:text-slate-400
          "
        >
          Verificando autorización...
        </p>

      </div>
    );
  }

  // ==========================================================
  // ESTADO 2
  // ACCESO DENEGADO
  // ==========================================================

  if (
    autorizado === false
  ) {

    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-slate-50
          p-6
          dark:bg-slate-950
        "
      >

        <div
          className="
            w-full
            max-w-md
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-8
            text-center
            shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
          "
        >

          {/* ==================================================
              ICONO
          ================================================== */}

          <div
            className="
              mx-auto
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

            <ShieldAlert
              className="
                h-7
                w-7
              "
            />

          </div>

          {/* ==================================================
              TÍTULO
          ================================================== */}

          <h2
            className="
              mt-5
              text-lg
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Acceso restringido
          </h2>

          {/* ==================================================
              MENSAJE
          ================================================== */}

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-slate-500
              dark:text-slate-400
            "
          >
            {mensaje ||
              "No tienes los permisos necesarios para acceder al módulo de administración."}
          </p>

          {/* ==================================================
              ACCIONES
          ================================================== */}

          <div
            className="
              mt-6
              flex
              flex-col
              gap-3
            "
          >

            <button
              type="button"
              onClick={() => {

                limpiarAsignacionActiva();

                router.replace(
                  RUTA_SELECCION_PERFIL
                );

              }}
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                text-sm
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
                dark:hover:bg-slate-700
              "
            >
              Cambiar perfil
            </button>

            <button
              type="button"
              onClick={() => {

                limpiarAsignacionActiva();

                router.replace(
                  RUTA_LOGIN
                );

              }}
              className="
                w-full
                rounded-xl
                bg-teal-600
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-teal-700
              "
            >
              Volver al inicio de sesión
            </button>

          </div>

        </div>

      </div>
    );
  }

  // ==========================================================
  // ESTADO 3
  // AUTORIZADO
  // ==========================================================

  return (
    <>
      {children}
    </>
  );
}