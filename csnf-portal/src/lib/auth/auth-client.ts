// ============================================================
// AUTENTICACIÓN CLIENTE
// Corporación Social Niños y Familia
// ============================================================

import { supabase } from "../supabase";

// ============================================================
// LOGIN
// ============================================================

export async function login(
  email: string,
  password: string
) {

  try {

    // ==========================================
    // Login en Supabase Auth
    // ==========================================

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({

        email,

        password,

      });

    if (error || !data.user) {

      return {

        success: false,

        error:
          error?.message ??
          "Credenciales inválidas.",

      };

    }

    // ==========================================
    // Obtener perfil del portal
    // ==========================================

    const {

      data: usuario,

      error: usuarioError,

    } =
      await supabase

        .from("usuarios")

        .select(`
          *,
          rol:roles(*),
          area:areas(*),
          departamento:departamentos(*)
        `)

        .eq(
          "id",
          data.user.id
        )

        .single();

    if (usuarioError || !usuario) {

      await supabase.auth.signOut();

      return {

        success: false,

        error:
          "El usuario no existe en el Portal.",

      };

    }

    // ==========================================
    // Login correcto
    // ==========================================

    return {

      success: true,

      session: data.session,

      user: data.user,

      usuario,

    };

  } catch (error) {

    console.error(

      "Error iniciando sesión:",

      error

    );

    return {

      success: false,

      error:
        "No fue posible iniciar sesión.",

    };

  }

}

// ============================================================
// RECUPERAR CONTRASEÑA
// ============================================================

export async function recuperarPassword(
  email:string
){

  try{

    const{

      error,

    }=
      await supabase.auth.resetPasswordForEmail(

        email,

        {

          redirectTo:
            `${window.location.origin}/cambiar-password`,

        }

      );

    if(error){

      return{

        success:false,

        error:error.message,

      };

    }

    return{

      success:true,

      message:
        "Si el correo existe, recibirás un enlace para cambiar la contraseña.",

    };

  }catch(error){

    console.error(
      "Error recuperando contraseña:",
      error
    );

    return{

      success:false,

      error:
        "No fue posible enviar el correo.",

    };

  }

}

// ============================================================
// CERRAR SESIÓN
// ============================================================

export async function logout(){

  await supabase.auth.signOut();

}

// ============================================================
// OBTENER SESIÓN
// ============================================================

export async function obtenerSesion(){

  return await supabase.auth.getSession();

}

// ============================================================
// OBTENER USUARIO AUTH
// ============================================================

export async function obtenerUsuario(){

  return await supabase.auth.getUser();

}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================

export async function cambiarPassword(
  nuevaPassword:string
){

  try{

    const{

      error,

    }=
      await supabase.auth.updateUser({

        password:nuevaPassword,

      });

    if(error){

      return{

        success:false,

        error:error.message,

      };

    }

    return{

      success:true,

    };

  }catch(error){

    console.error(
      "Error cambiando contraseña:",
      error
    );

    return{

      success:false,

      error:
        "No fue posible cambiar la contraseña.",

    };

  }

}