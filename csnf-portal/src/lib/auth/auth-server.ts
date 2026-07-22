// ============================================================
// AUTENTICACIÓN SERVIDOR
// Corporación Social Niños y Familia
// ============================================================

import { supabaseAdmin } from "../supabase-admin";

// ============================================================
// OBTENER USUARIO DEL PORTAL
// ============================================================

export async function obtenerUsuarioPortal(
  id:string
){

  try{

    const{

      data,

      error,

    }=
      await supabaseAdmin

        .from("usuarios")

        .select("*")

        .eq("id",id)

        .single();

    if(error){

      return null;

    }

    return data;

  }catch(error){

    console.error(

      "Error obteniendo usuario:",

      error

    );

    return null;

  }

}

// ============================================================
// MARCAR CAMBIO DE CONTRASEÑA
// ============================================================

export async function marcarPasswordCambiada(
  id:string
){

  try{

    const{

      error,

    }=
      await supabaseAdmin

        .from("usuarios")

        .update({

          password_cambiada:true,

          updated_at:new Date().toISOString(),

        })

        .eq("id",id);

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

      "Error actualizando contraseña:",

      error

    );

    return{

      success:false,

      error:"No fue posible actualizar el usuario.",

    };

  }

}