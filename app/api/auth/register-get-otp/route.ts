import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthUserRegistrationRow = {
  id: string;
  email_confirmed_at: Date | null;
  confirmed_at: Date | null;
};

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function isEmailAlreadyRegistered(email: string) {
  const existingProfile = await prisma.adminProfile.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingProfile) return true;

  const authUsers = await prisma.$queryRaw<AuthUserRegistrationRow[]>`
    SELECT id, email_confirmed_at, confirmed_at
    FROM auth.users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;

  return authUsers.some((user) => user.email_confirmed_at || user.confirmed_at);
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const trimmedEmail = normalizeEmail(email);

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      return NextResponse.json({ error: "Emel tidak sah." }, { status: 400 });
    }

    const isRegistered = await isEmailAlreadyRegistered(trimmedEmail);

    if (isRegistered) {
      return NextResponse.json(
        { error: "Emel ini sudah didaftarkan." },
        { status: 409 }
      );
    }

    // Send only an email OTP. Password and name are submitted after OTP verification.
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ message: "OTP berjaya dihantar." });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
