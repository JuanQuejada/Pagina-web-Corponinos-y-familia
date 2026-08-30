import { NextResponse } from "next/server";
import { repositoryCookieName } from "@/lib/repository-session";

export async function POST() {
  const response = NextResponse.json({ success: true, autorizado: false });
  response.cookies.set({
    name: repositoryCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
