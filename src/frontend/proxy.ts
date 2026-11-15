import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const token = request.cookies.get("token");
    if (token && (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register")))
        return (NextResponse.redirect(new URL('/dashboard', request.url)));
    else if (!token && request.nextUrl.pathname.startsWith("/dashboard"))
        return (NextResponse.redirect(new URL('/login', request.url)));

    return (NextResponse.next());
}

export const config = {
    matcher: ["/dashboard/:path*", "/login/:path*", "/register/:path*"]
}