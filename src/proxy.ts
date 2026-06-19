import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  if (!req.auth && !req.url.includes("/login") && !req.url.includes("/register")) {
    const loginUrl = new URL("/login", req.url);
    return Response.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
