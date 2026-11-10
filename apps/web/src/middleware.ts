import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()
  const login = new URL("/login", request.url)
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = { matcher: ["/app/:path*", "/settings/:path*"] }
