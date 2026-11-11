import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const res = await fetch(`${process.env.AUTH_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    return NextResponse.json(
      { message: error?.message ?? "Login failed" },
      { status: res.status },
    );
  }

  const { accessToken, expiresIn } = await res.json();

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
  return response;
}