"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  Power,
  KeyRound,
  GitCommit,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface OptionSelect {
  id: string;
  nombre: string;
}

interface CargoOption {
  id: string;
  nombre: string;
  departamento_id: string;
}

interface Usuario {
  id: string;
  nombres?: string | null;
  apellidos?: string | null;
  razon_social?: string | null;
  email?: string;
  numero_identificacion?: string;
  telefono?: string;
  direccion?: string;
  foto_url?: string | null;
  avatar_url?: string | null;
  foto?: string | null;
  cargo_id?: string;
  tipo_persona_id?: string | null;
  tipo_identificacion_id?: string | null;
  estado_usuario_id?: string;
  clave_repositorio?: string;
  puede_iniciar_flujos?: boolean;
  activo?: boolean | null;
  cargos?: {
    id: string;
    nombre: string | null;
    departamentos?: {
      id: string;
      nombre: string;
    };
  };
  estados_usuario?: {
    id: string | null;
    nombre: string;
    codigo: string;
  };
}

export default function ModuloUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Control de Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalVerAbierto, setModalVerAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  
  // Listas Maestras
  const [tiposPersona, setTiposPersona] = useState<OptionSelect[]>([]);
  const [tiposIdentificacion, setTiposIdentificacion] = useState<OptionSelect[]>([]);
  const [departamentos, setDepartamentos] = useState<OptionSelect[]>([]);
  const [cargos, setCargos] = useState<CargoOption[]>([]);
  const [cargosFiltrados, setCargosFiltrados] = useState<CargoOption[]>([]);
  const [estadosUsuario, setEstadosUsuario] = useState<OptionSelect[]>([]);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    id: "",
    email: "",
    password: "",
    tipo_persona_id: "",
    tipo_identificacion_id: "",
    numero_identificacion: "",
    nombres: "",
    apellidos: "",
    razon_social: "",
    telefono: "",
    direccion: "",
    departamento_id: "",
    cargo_id: "",
    estado_usuario_id: "",
    foto_url: "",
    clave_repositorio: "",
    puede_iniciar_flujos: false,
  });

  useEffect(() => {
    cargarUsuarios();
    cargarTablasMaestras();
  }, []);

  // Filtrar cargos cuando cambia el departamento en el formulario
  useEffect(() => {
    if (formData.departamento_id) {
      const filtrados = cargos.filter((c) => c.departamento_id === formData.departamento_id);
      setCargosFiltrados(filtrados);
    } else {
      setCargosFiltrados(cargos);
    }
  }, [formData.departamento_id, cargos]);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const { data: listaUsuarios, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (userError) {
        console.error("Error al obtener usuarios:", userError);
        setCargando(false);
        return;
      }

      const [resCargos, resDeptos, resEstados] = await Promise.all([
        supabase.from("cargos").select("id, nombre, departamento_id"),
        supabase.from("departamentos").select("id, nombre"),
        supabase.from("estados_usuario").select("id, nombre, codigo"),
      ]);

      const mapaCargos = new Map((resCargos.data || []).map((c) => [c.id, c]));
      const mapaDeptos = new Map((resDeptos.data || []).map((d) => [d.id, d]));
      const mapaEstados = new Map((resEstados.data || []).map((e) => [e.id, e]));

      const usuariosCompletos = (listaUsuarios || []).map((u) => {
        const cargoObj = u.cargo_id ? mapaCargos.get(u.cargo_id) : null;
        const deptoObj = cargoObj?.departamento_id ? mapaDeptos.get(cargoObj.departamento_id) : null;
        const estadoObj = u.estado_usuario_id ? mapaEstados.get(u.estado_usuario_id) : null;

        return {
          ...u,
          cargos: cargoObj
            ? {
                id: cargoObj.id,
                nombre: cargoObj.nombre,
                departamentos: deptoObj
                  ? { id: deptoObj.id, nombre: deptoObj.nombre }
                  : undefined,
              }
            : undefined,
          estados_usuario: estadoObj ? { id: estadoObj.id, nombre: estadoObj.nombre, codigo: estadoObj.codigo } : undefined,
        };
      });

      setUsuarios(usuariosCompletos as any);
    } catch (err) {
      console.error("Error inesperado en cargarUsuarios:", err);
    } finally {
      setCargando(false);
    }
  };

  const cargarTablasMaestras = async () => {
    try {
      const [resTP, resTI, resDep, resCar, resEU] = await Promise.all([
        supabase.from("tipos_persona").select("id, nombre").eq("activo", true),
        supabase.from("tipos_identificacion").select("id, nombre").eq("activo", true),
        supabase.from("departamentos").select("id, nombre").eq("activo", true),
        supabase.from("cargos").select("id, nombre, departamento_id").eq("activo", true),
        supabase.from("estados_usuario").select("id, nombre, codigo").eq("activo", true),
      ]);

      if (resTP.data) setTiposPersona(resTP.data);
      if (resTI.data) setTiposIdentificacion(resTI.data);
      if (resDep.data) setDepartamentos(resDep.data);
      if (resCar.data) {
        setCargos(resCar.data);
        setCargosFiltrados(resCar.data);
      }
      if (resEU.data) setEstadosUsuario(resEU.data);
    } catch (err) {
      console.error("Error al cargar maestras:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      email: "",
      password: "",
      tipo_persona_id: "",
      tipo_identificacion_id: "",
      numero_identificacion: "",
      nombres: "",
      apellidos: "",
      razon_social: "",
      telefono: "",
      direccion: "",
      departamento_id: "",
      cargo_id: "",
      estado_usuario_id: "",
      foto_url: "",
      clave_repositorio: "",
      puede_iniciar_flujos: false,
    });
    setModoEdicion(false);
    setMensaje(null);
  };

  const abrirModalCrear = () => {
    resetForm();
    setModalAbierto(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    resetForm();
    setModoEdicion(true);

    const cargoAsociado = cargos.find((c) => c.id === u.cargo_id);

    setFormData({
      id: u.id,
      email: u.email || "",
      password: "",
      tipo_persona_id: u.tipo_persona_id || "",
      tipo_identificacion_id: u.tipo_identificacion_id || "",
      numero_identificacion: u.numero_identificacion || "",
      nombres: u.nombres || "",
      apellidos: u.apellidos || "",
      razon_social: u.razon_social || "",
      telefono: u.telefono || "",
      direccion: u.direccion || "",
      departamento_id: cargoAsociado?.departamento_id || "",
      cargo_id: u.cargo_id || "",
      estado_usuario_id: u.estado_usuario_id || "",
      foto_url: u.foto_url || "",
      clave_repositorio: u.clave_repositorio || "",
      puede_iniciar_flujos: u.puede_iniciar_flujos || false,
    });
    setModalAbierto(true);
  };

  const abrirModalVer = (u: Usuario) => {
    setUsuarioSeleccionado(u);
    setModalVerAbierto(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);

    try {
      if (modoEdicion) {
        const datosActualizacion: any = {
          tipo_persona_id: formData.tipo_persona_id || null,
          tipo_identificacion_id: formData.tipo_identificacion_id || null,
          numero_identificacion: formData.numero_identificacion,
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          razon_social: formData.razon_social || null,
          telefono: formData.telefono,
          direccion: formData.direccion,
          cargo_id: formData.cargo_id || null,
          estado_usuario_id: formData.estado_usuario_id || null,
          foto_url: formData.foto_url || null,
          puede_iniciar_flujos: formData.puede_iniciar_flujos,
        };

        // Solo actualizar la clave privada si se proporcionó una nueva
        if (formData.clave_repositorio) {
          datosActualizacion.clave_repositorio = formData.clave_repositorio;
        }

        const { error: updateError } = await supabase
          .from("usuarios")
          .update(datosActualizacion)
          .eq("id", formData.id);

        if (updateError) throw updateError;

        setMensaje({ tipo: "exito", texto: "Usuario actualizado correctamente." });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { nombres: formData.nombres, apellidos: formData.apellidos },
          },
        });

        if (authError) throw authError;

        const newUserId = authData.user?.id;
        if (!newUserId) throw new Error("No se pudo obtener el ID de autenticación.");

        const { error: dbError } = await supabase.from("usuarios").insert([
          {
            id: newUserId,
            auth_user_id: newUserId,
            email: formData.email,
            tipo_persona_id: formData.tipo_persona_id as string,
            tipo_identificacion_id: formData.tipo_identificacion_id as string,
            numero_identificacion: formData.numero_identificacion,
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            razon_social: formData.razon_social || null,
            telefono: formData.telefono,
            direccion: formData.direccion,
            cargo_id: formData.cargo_id || null,
            estado_usuario_id: formData.estado_usuario_id as string,
            foto_url: formData.foto_url || null,
            clave_repositorio: formData.clave_repositorio || null,
            puede_iniciar_flujos: formData.puede_iniciar_flujos,
          },
        ]);

        if (dbError) throw dbError;

        setMensaje({ tipo: "exito", texto: "Usuario creado exitosamente con credenciales y permisos." });
      }

      cargarUsuarios();
      setTimeout(() => {
        setModalAbierto(false);
        resetForm();
      }, 1200);
    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      setMensaje({
        tipo: "error",
        texto: error.message || "Error al procesar la solicitud en Supabase.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstadoUsuario = async (u: Usuario) => {
    const estadoActivoObj = estadosUsuario.find((e: any) => e.codigo === "ACT" || e.nombre.toLowerCase() === "activo");
    const estadoInactivoObj = estadosUsuario.find((e: any) => e.codigo === "INA" || e.nombre.toLowerCase() === "inactivo");

    const esActivoActual = u.estados_usuario?.codigo === "ACT" || u.estados_usuario?.nombre?.toLowerCase() === "activo";
    const nuevoEstadoId = esActivoActual ? estadoInactivoObj?.id : estadoActivoObj?.id;

    if (!nuevoEstadoId) {
      alert("No se encontró el ID del estado en la tabla estados_usuario.");
      return;
    }

    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ estado_usuario_id: nuevoEstadoId })
        .eq("id", u.id);

      if (error) throw error;
      cargarUsuarios();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const eliminarUsuario = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar al usuario ${nombre}?`)) return;

    try {
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
      cargarUsuarios();
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      alert("No se pudo eliminar el usuario debido a restricciones de base de datos.");
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const termino = busqueda.toLowerCase();
    const nombreFull = `${u.nombres || ""} ${u.apellidos || ""} ${u.razon_social || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const cargo = (u.cargos?.nombre || "").toLowerCase();
    const depto = (u.cargos?.departamentos?.nombre || "").toLowerCase();

    return (
      nombreFull.includes(termino) ||
      email.includes(termino) ||
      cargo.includes(termino) ||
      depto.includes(termino)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Gestión de Usuarios y Permisos
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Administra los accesos al repositorio privado y permisos de inicio de flujos de aprobación.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, cargo o departamento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-0 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-gray-400">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">CÓDIGO / ID</th>
                  <th className="px-6 py-3.5">NOMBRE DEL USUARIO</th>
                  <th className="px-6 py-3.5">DEPARTAMENTO / CARGO</th>
                  <th className="px-6 py-3.5">PERMISOS DE FLUJO</th>
                  <th className="px-6 py-3.5">ESTADO</th>
                  <th className="px-6 py-3.5 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const nombreMostrar = u.razon_social || `${u.nombres || ""} ${u.apellidos || ""}`.trim() || "Sin Nombre";
                    const deptoNombre = u.cargos?.departamentos?.nombre || "Sin Departamento";
                    const cargoNombre = u.cargos?.nombre || "Sin Cargo";
                    const estaActivo = u.estados_usuario?.nombre?.toLowerCase() === "activo" || !u.estados_usuario;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 font-mono font-medium text-gray-500 dark:text-slate-400">
                          {u.numero_identificacion || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.foto_url ? (
                              <img
                                src={u.foto_url}
                                alt="Foto"
                                className="h-9 w-9 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-900">
                                {nombreMostrar.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-xs">{nombreMostrar}</p>
                              <p className="text-[11px] text-gray-400 font-normal">{u.email || u.telefono || "Sin contacto"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-700 dark:text-slate-300">{deptoNombre}</p>
                          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold text-[10px]">
                            {cargoNombre}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.puede_iniciar_flujos ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                              <GitCommit className="h-3 w-3" />
                              Inicia y Firma
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-[10px] font-medium">
                              Solo Firma
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            estaActivo 
                              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" 
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {estaActivo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirModalVer(u)}
                              title="Ver detalles"
                              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => abrirModalEditar(u)}
                              title="Editar usuario"
                              className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-all"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => eliminarUsuario(u.id, nombreMostrar)}
                              title="Eliminar usuario"
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleEstadoUsuario(u)}
                              title={estaActivo ? "Desactivar" : "Activar"}
                              className={`p-1.5 rounded-lg transition-all ${
                                estaActivo
                                  ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/50"
                                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                {modoEdicion ? "Editar Usuario y Accesos" : "Registrar Nuevo Usuario"}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              {mensaje && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                  mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {mensaje.tipo === "exito" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {mensaje.texto}
                </div>
              )}

              {/* Credenciales (Solo en creación) */}
              {!modoEdicion && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Credenciales de Acceso al Portal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Correo Electrónico *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="usuario@dominio.com"
                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Contraseña (Login) *</label>
                      <input
                        type="password"
                        name="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="******"
                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Seguridad y Privacidad de Repositorio */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Seguridad y Repositorio Privado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                      Clave de Repositorio Privado
                    </label>
                    <input
                      type="text"
                      name="clave_repositorio"
                      value={formData.clave_repositorio}
                      onChange={handleChange}
                      placeholder={modoEdicion ? "Dejar en blanco para mantener la actual" : "PIN o Clave de acceso secreta"}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Diferente a la contraseña de inicio de sesión.</span>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        name="puede_iniciar_flujos"
                        checked={formData.puede_iniciar_flujos}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">¿Puede Iniciar Flujos de Aprobación?</span>
                        <span className="text-[10px] text-gray-400 block">Si está desactivado, solo podrá firmar documentos asignados.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Identificación */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Identificación</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tipo Persona</label>
                    <select
                      name="tipo_persona_id"
                      value={formData.tipo_persona_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {tiposPersona.map((tp) => (
                        <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tipo Documento</label>
                    <select
                      name="tipo_identificacion_id"
                      value={formData.tipo_identificacion_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {tiposIdentificacion.map((ti) => (
                        <option key={ti.id} value={ti.id}>{ti.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">N° Documento</label>
                    <input
                      type="text"
                      name="numero_identificacion"
                      value={formData.numero_identificacion}
                      onChange={handleChange}
                      placeholder="123456789"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Información Personal */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Información Personal / Empresa</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nombres</label>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleChange}
                      placeholder="Juan Andrés"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Apellidos</label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      placeholder="Pérez Gómez"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Razón Social</label>
                    <input
                      type="text"
                      name="razon_social"
                      value={formData.razon_social}
                      onChange={handleChange}
                      placeholder="Empresa S.A.S."
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Teléfono</label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="+57 300 000 0000"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Asignación Organizacional */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Asignación Organizacional</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Departamento</label>
                    <select
                      name="departamento_id"
                      value={formData.departamento_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cargo</label>
                    <select
                      name="cargo_id"
                      value={formData.cargo_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {cargosFiltrados.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Estado</label>
                    <select
                      name="estado_usuario_id"
                      value={formData.estado_usuario_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {estadosUsuario.map((eu) => (
                        <option key={eu.id} value={eu.id}>{eu.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modoEdicion ? "Actualizar Usuario" : "Guardar Usuario"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER DETALLES */}
      {modalVerAbierto && usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Detalles del Usuario</h3>
              <button onClick={() => setModalVerAbierto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
              <div>
                <span className="text-gray-400 block">Nombre / Razón Social:</span>
                <strong className="text-gray-900 dark:text-white text-sm">
                  {usuarioSeleccionado.razon_social || `${usuarioSeleccionado.nombres || ""} ${usuarioSeleccionado.apellidos || ""}`}
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 block">Identificación:</span>
                  <span className="font-mono">{usuarioSeleccionado.numero_identificacion || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Permiso de Flujos:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {usuarioSeleccionado.puede_iniciar_flujos ? "Puede Iniciar y Firmar" : "Solo Firma"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-400 block">Correo Electrónico:</span>
                <span>{usuarioSeleccionado.email || "No registrado"}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Teléfono / Dirección:</span>
                <span>{usuarioSeleccionado.telefono || "Sin teléfono"} - {usuarioSeleccionado.direccion || "Sin dirección"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div>
                  <span className="text-gray-400 block">Departamento:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{usuarioSeleccionado.cargos?.departamentos?.nombre || "Sin Asignar"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Cargo:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{usuarioSeleccionado.cargos?.nombre || "Sin Asignar"}</span>
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalVerAbierto(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}