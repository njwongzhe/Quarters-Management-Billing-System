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

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
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
    const { fullName, email, password, otp } = await request.json();

    const trimmedEmail = normalizeEmail(email);
    const trimmedFullName = typeof fullName === "string" ? fullName.trim() : "";
    const trimmedOtp = typeof otp === "string" ? otp.trim() : "";

    if (!trimmedFullName) {
      return NextResponse.json({ error: "Nama penuh diperlukan." }, { status: 400 });
    }

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      return NextResponse.json({ error: "Emel tidak sah." }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Kata laluan mesti sekurang-kurangnya 8 aksara." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      return NextResponse.json(
        { error: "OTP tidak sah. Pastikan 6 digit angka." },
        { status: 400 }
      );
    }

    const isRegistered = await isEmailAlreadyRegistered(trimmedEmail);

    if (isRegistered) {
      return NextResponse.json(
        { error: "Emel ini sudah didaftarkan." },
        { status: 409 }
      );
    }

    // Verify OTP.
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedOtp,
      type: 'email',
    });

    if (verifyError) {
      return NextResponse.json({ error: verifyError.message }, { status: 400 });
    }

    if (!verifyData.session) {
      return NextResponse.json({ error: "Sesi pengesahan tidak sah." }, { status: 400 });
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: trimmedFullName },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Sync user data to Admin Profile table.
    const userId = verifyData.user?.id;
    if (userId) {
      try {
        await prisma.adminProfile.create({
          data: {
            id: userId,
            email: trimmedEmail,
            fullName: trimmedFullName,
            role: 'admin',
            isActive: true,
          },
        });
      } catch (dbError) {
        if (isPrismaUniqueError(dbError)) {
          return NextResponse.json(
            { error: "Emel ini sudah didaftarkan." },
            { status: 409 }
          );
        }

        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
        console.error('Failed to create admin profile:', errorMessage);
        return NextResponse.json(
          { error: "Pendaftaran berjaya disahkan, tetapi profil gagal dicipta." },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: "Pengguna tidak ditemui selepas pengesahan." }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Registration successful!", 
      session: verifyData.session 
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
