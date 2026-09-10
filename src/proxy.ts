import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-only-not-for-prod");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("ridgeway_session")?.value;
  const needsAuth =
    pathname.startsWith("/account") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/book/pay") ||
    pathname.startsWith("/book/confirmation");

  if (!needsAuth) return NextResponse.next();

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = String(payload.role ?? "");
    if (pathname.startsWith("/staff") && role !== "ADMIN" && role !== "THERAPIST") {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    if (pathname.startsWith("/account") && (role === "ADMIN" || role === "THERAPIST")) {
      return NextResponse.redirect(new URL("/staff", request.url));
    }
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: [
    "/account/:path*",
    "/staff/:path*",
    "/book/pay/:path*",
    "/book/confirmation/:path*",
  ],
};
