"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Trash2,
  Camera,
  AlertCircle,
  User,
  Building,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function PerfilPage() {
  const {
    usuarioPortal,
    actualizarSesion,
  } = useAuth();

  const [subiendo, setSubiendo] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [errorPeso, setErrorPeso] =
    useState<string | null>(null);

  // ==========================================================
  // USUARIO
  // ==========================================================

  const usuario =
    (usuarioPortal as any)?.usuario ??
    usuarioPortal;

  const listaAsignaciones =
    (usuarioPortal as any)?.asignaciones ?? [];

  // ==========================================================
  // ASIGNACIÓN ACTIVA
  //
  // IMPORTANTE:
  // NO usar listaAsignaciones[0].
  //
  // El usuario puede tener múltiples cargos.
  // ==========================================================

  const asignacionActivaId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(
          "csnf_perfil_activo"
        )
      : null;

  const asignacionActiva =
    Array.isArray(listaAsignaciones)
      ? (
          listaAsignaciones.find(
            (a: any) =>
              a.id === asignacionActivaId
          ) ??
          listaAsignaciones.find(
            (a: any) =>
              a.perfil_predeterminado === true
          ) ??
          listaAsignaciones[0] ??
          null
        )
      : null;

  // ==========================================================
  // DATOS MOSTRADOS
  // ==========================================================

  const [cargoMostrar, setCargoMostrar] =
    useState("Cargando cargo...");

  const [departamentoMostrar, setDepartamentoMostrar] =
    useState("Cargando departamento...");

  const [areaMostrar, setAreaMostrar] =
    useState("Cargando área...");

  const [rolMostrar, setRolMostrar] =
    useState("Cargando rol...");

  const [tipoPersonaMostrar, setTipoPersonaMostrar] =
    useState("Persona Natural");

  const [tipoDocumentoMostrar, setTipoDocumentoMostrar] =
    useState("Documento de Identidad");

  // ==========================================================
  // DATOS PERSONALES EDITABLES
  // ==========================================================

  const [telefono, setTelefono] =
    useState("");

  const [direccion, setDireccion] =
    useState("");

  useEffect(() => {
    if (!usuario) return;

    setTelefono(
      usuario.telefono ?? ""
    );

    setDireccion(
      usuario.direccion ?? ""
    );
  }, [usuario]);

  // ==========================================================
  // RESOLVER INFORMACIÓN
  // ==========================================================

  useEffect(() => {
    async function resolverRelaciones() {
      if (!usuario) return;

      try {
        // ------------------------------------------------------
        // TIPO PERSONA
        // ------------------------------------------------------

        const tipoPersonaId =
          usuario.tipo_persona_id;

        if (tipoPersonaId) {
          if (
            typeof tipoPersonaId === "object" &&
            tipoPersonaId !== null
          ) {
            setTipoPersonaMostrar(
              (tipoPersonaId as any).nombre ??
                "Persona Natural"
            );
          } else {
            const {
              data,
            } = await supabase
              .from("tipos_persona")
              .select("nombre")
              .eq("id", tipoPersonaId)
              .maybeSingle();

            if (data?.nombre) {
              setTipoPersonaMostrar(
                data.nombre
              );
            }
          }
        }

        // ------------------------------------------------------
        // TIPO IDENTIFICACIÓN
        // ------------------------------------------------------

        const tipoIdentificacionId =
          usuario.tipo_identificacion_id;

        if (tipoIdentificacionId) {
          if (
            typeof tipoIdentificacionId === "object" &&
            tipoIdentificacionId !== null
          ) {
            setTipoDocumentoMostrar(
              (tipoIdentificacionId as any).nombre ??
                (tipoIdentificacionId as any).sigla ??
                "Documento de Identidad"
            );
          } else {
            const {
              data,
            } = await supabase
              .from("tipos_identificacion")
              .select("nombre")
              .eq(
                "id",
                tipoIdentificacionId
              )
              .maybeSingle();

            if (data?.nombre) {
              setTipoDocumentoMostrar(
                data.nombre
              );
            }
          }
        }

        // ------------------------------------------------------
        // ASIGNACIÓN ACTIVA
        // ------------------------------------------------------

        if (!asignacionActiva) {
          setCargoMostrar(
            "Sin asignación"
          );

          setDepartamentoMostrar(
            "Sin departamento"
          );

          setAreaMostrar(
            "Sin área"
          );

          setRolMostrar(
            "Sin rol"
          );

          return;
        }

        // ------------------------------------------------------
        // CARGO
        // ------------------------------------------------------

        const cargoId =
          typeof asignacionActiva.cargo_id === "object" &&
          asignacionActiva.cargo_id !== null
            ? asignacionActiva.cargo_id.id
            : asignacionActiva.cargo_id;

        if (cargoId) {
          const {
            data: cargoData,
          } = await supabase
            .from("cargos")
            .select(`
              nombre,
              departamento:departamentos (
                nombre,
                area:areas (
                  nombre
                )
              )
            `)
            .eq("id", cargoId)
            .maybeSingle();

          if (cargoData) {
            setCargoMostrar(
              cargoData.nombre ??
                "Cargo Institucional"
            );

            const departamento: any =
              cargoData.departamento;

            if (departamento) {
              setDepartamentoMostrar(
                departamento.nombre ??
                  "Departamento General"
              );

              const area: any =
                departamento.area;

              if (area) {
                setAreaMostrar(
                  area.nombre ??
                    "Área Administrativa"
                );
              }
            }
          }
        }

        // ------------------------------------------------------
        // ROL
        // ------------------------------------------------------

        const rolId =
          typeof asignacionActiva.rol_id === "object" &&
          asignacionActiva.rol_id !== null
            ? asignacionActiva.rol_id.id
            : asignacionActiva.rol_id;

        if (rolId) {
          const {
            data: rolData,
          } = await supabase
            .from("roles")
            .select("nombre")
            .eq("id", rolId)
            .maybeSingle();

          if (rolData?.nombre) {
            setRolMostrar(
              rolData.nombre
            );
          }
        }
      } catch (error) {
        console.error(
          "Error resolviendo relaciones del perfil:",
          error
        );
      }
    }

    resolverRelaciones();
  }, [
    usuario,
    asignacionActivaId,
    asignacionActiva,
  ]);

  // ==========================================================
  // TOKEN DE SESIÓN
  // ==========================================================

  async function obtenerTokenSesion() {
    const {
      data,
      error,
    } = await supabase.auth.getSession();

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "La sesión no es válida o ha expirado."
      );
    }

    return data.session.access_token;
  }

  // ==========================================================
  // SUBIR FOTOGRAFÍA
  // ==========================================================

  const manejarSubirFoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setErrorPeso(null);

    const file =
      e.target.files?.[0];

    if (
      !file ||
      !usuario?.id
    ) {
      return;
    }

    const MAX_SIZE_BYTES =
      300 * 1024;

    if (
      file.size >
      MAX_SIZE_BYTES
    ) {
      const pesoKB =
        (file.size / 1024).toFixed(1);

      setErrorPeso(
        `El archivo pesa ${pesoKB} KB. El tamaño máximo permitido es de 300 KB.`
      );

      e.target.value = "";
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(
        file.type
      )
    ) {
      setErrorPeso(
        "Formato no permitido. Use JPG, PNG o WEBP."
      );

      e.target.value = "";
      return;
    }

    try {
      setSubiendo(true);

      const token =
        await obtenerTokenSesion();

      const formData =
        new FormData();

      formData.append(
        "foto",
        file
      );

      const response =
        await fetch(
          "/api/usuarios/perfil",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const resultado =
        await response.json();

      if (
        !response.ok ||
        !resultado.success
      ) {
        throw new Error(
          resultado.error ??
            "No fue posible subir la fotografía."
        );
      }

      if (actualizarSesion) {
        await actualizarSesion();
      }

      alert(
        "¡Fotografía de perfil actualizada con éxito!"
      );
    } catch (error: any) {
      console.error(
        "Error subiendo fotografía:",
        error
      );

      alert(
        "Error al subir la imagen: " +
          (
            error?.message ??
            "Error desconocido."
          )
      );
    } finally {
      setSubiendo(false);

      e.target.value = "";
    }
  };

  // ==========================================================
  // ELIMINAR FOTOGRAFÍA
  // ==========================================================

  const manejarEliminarFoto =
    async () => {
      if (!usuario?.id) return;

      const confirmar =
        confirm(
          "¿Está seguro de que desea eliminar su fotografía de perfil?"
        );

      if (!confirmar) return;

      try {
        setSubiendo(true);

        const token =
          await obtenerTokenSesion();

        const response =
          await fetch(
            "/api/usuarios/perfil",
            {
              method: "DELETE",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const resultado =
          await response.json();

        if (
          !response.ok ||
          !resultado.success
        ) {
          throw new Error(
            resultado.error ??
              "No fue posible eliminar la fotografía."
          );
        }

        if (actualizarSesion) {
          await actualizarSesion();
        }

        alert(
          "Fotografía eliminada correctamente."
        );
      } catch (error: any) {
        console.error(
          "Error eliminando fotografía:",
          error
        );

        alert(
          "Error al eliminar fotografía: " +
            (
              error?.message ??
              "Error desconocido."
            )
        );
      } finally {
        setSubiendo(false);
      }
    };

  // ==========================================================
  // GUARDAR PERFIL
  // ==========================================================

  const manejarGuardarPerfil =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (!usuario?.id) return;

      try {
        setGuardando(true);

        const token =
          await obtenerTokenSesion();

        const response =
          await fetch(
            "/api/usuarios/perfil",
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                telefono,
                direccion,
              }),
            }
          );

        const resultado =
          await response.json();

        if (
          !response.ok ||
          !resultado.success
        ) {
          throw new Error(
            resultado.error ??
              "No fue posible actualizar el perfil."
          );
        }

        if (actualizarSesion) {
          await actualizarSesion();
        }

        alert(
          "¡Perfil actualizado con éxito!"
        );
      } catch (error: any) {
        console.error(
          "Error actualizando perfil:",
          error
        );

        alert(
          "Error al actualizar perfil: " +
            (
              error?.message ??
              "Error desconocido."
            )
        );
      } finally {
        setGuardando(false);
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  const numeroDocumentoMostrar =
    usuario?.numero_identificacion ??
    "No registrado";

  const nombreMostrar =
    usuario?.nombreCompleto ||
    usuario?.razon_social ||
    "Sin nombre";

  const fotoUrl =
    usuario?.foto_url ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Mi Perfil
        </h1>

        <p className="text-sm text-gray-500">
          Consulte y actualice la información de su cuenta institucional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ====================================================
            COLUMNA 1
        ==================================================== */}

        <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">

          <div className="relative mb-4 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-md bg-gradient-to-br from-emerald-600 to-teal-800">

            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={String(
                  nombreMostrar
                )}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-extrabold text-white">
                {String(
                  nombreMostrar
                ).charAt(0)}
              </span>
            )}

          </div>

          <h2 className="text-base font-bold uppercase tracking-tight text-slate-800">
            {String(
              nombreMostrar
            )}
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            {cargoMostrar}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {departamentoMostrar}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {rolMostrar}
            </span>

          </div>

          <div className="mt-6 flex w-full flex-col gap-2.5">

            <label
              className="
                flex
                w-full
                cursor-pointer
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-emerald-600
                px-4
                py-2.5
                text-xs
                font-semibold
                text-white
                transition-all
                hover:bg-emerald-700
                disabled:opacity-50
              "
            >

              <Upload className="h-4 w-4" />

              {subiendo
                ? "Procesando..."
                : "Cambiar fotografía"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  manejarSubirFoto
                }
                disabled={subiendo}
                className="hidden"
              />

            </label>

            {fotoUrl && (
              <button
                type="button"
                onClick={
                  manejarEliminarFoto
                }
                disabled={subiendo}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-rose-200
                  bg-rose-50
                  px-4
                  py-2.5
                  text-xs
                  font-semibold
                  text-rose-600
                  transition-all
                  hover:bg-rose-100
                  disabled:opacity-50
                "
              >
                <Trash2 className="h-4 w-4" />
                Eliminar fotografía
              </button>
            )}

          </div>

          {errorPeso && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-left text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                {errorPeso}
              </span>
            </div>
          )}

          <div className="mt-6 w-full border-t border-slate-100 pt-4 text-left">

            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Camera className="h-3.5 w-3.5" />
              Formatos permitidos: JPG, PNG y WEBP.
            </p>

            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Tamaño máximo recomendado:
              {" "}
              <strong>300 KB</strong>.
            </p>

          </div>

        </div>

        {/* ====================================================
            COLUMNAS 2 Y 3
        ==================================================== */}

        <div className="space-y-6 lg:col-span-2">

          <form
            onSubmit={
              manejarGuardarPerfil
            }
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >

            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">

              <User className="h-5 w-5 text-emerald-600" />

              <h2 className="text-base font-bold text-gray-900">
                Información Personal
              </h2>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Tipo de Persona
                </label>

                <input
                  type="text"
                  disabled
                  value={
                    tipoPersonaMostrar
                  }
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Tipo de Identificación
                </label>

                <input
                  type="text"
                  disabled
                  value={
                    tipoDocumentoMostrar
                  }
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Número de Identificación
                </label>

                <input
                  type="text"
                  disabled
                  value={String(
                    numeroDocumentoMostrar
                  )}
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Nombres y Apellidos / Razón Social
                </label>

                <input
                  type="text"
                  disabled
                  value={String(
                    nombreMostrar
                  )}
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Correo Electrónico
                </label>

                <input
                  type="email"
                  disabled
                  value={
                    usuario?.email ??
                    "Sin correo"
                  }
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Teléfono de Contacto
                </label>

                <input
                  type="text"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(
                      e.target.value
                    )
                  }
                  placeholder="Ej: 300 123 4567"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700">
                  Dirección
                </label>

                <input
                  type="text"
                  value={direccion}
                  onChange={(e) =>
                    setDireccion(
                      e.target.value
                    )
                  }
                  placeholder="Ej: Calle 10 # 20 - 30"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

            </div>

            <div className="flex justify-end pt-2">

              <button
                type="submit"
                disabled={guardando}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-emerald-600
                  px-5
                  py-2.5
                  text-xs
                  font-semibold
                  text-white
                  shadow
                  hover:bg-emerald-700
                  disabled:opacity-50
                "
              >

                <Save className="h-4 w-4" />

                {guardando
                  ? "Guardando..."
                  : "Guardar cambios"}

              </button>

            </div>

          </form>

          {/* ==================================================
              INFORMACIÓN INSTITUCIONAL
          ================================================== */}

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">

              <Building className="h-5 w-5 text-emerald-600" />

              <h2 className="text-base font-bold text-gray-900">
                Información Institucional
              </h2>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Cargo
                </label>

                <input
                  type="text"
                  disabled
                  value={cargoMostrar}
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Departamento
                </label>

                <input
                  type="text"
                  disabled
                  value={
                    departamentoMostrar
                  }
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Área
                </label>

                <input
                  type="text"
                  disabled
                  value={areaMostrar}
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Rol asignado
                </label>

                <input
                  type="text"
                  disabled
                  value={rolMostrar}
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}