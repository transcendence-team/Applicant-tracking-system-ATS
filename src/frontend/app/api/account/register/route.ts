import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const res = await fetch(`${process.env.AUTH_API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    return NextResponse.json(
      { message: error?.message ?? "Register failed" },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });;
}