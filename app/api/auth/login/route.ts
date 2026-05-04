import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from '@/lib/prisma';

import { SESSION_COOKIE_NAME } from "@/app/constants/auth-server";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalizeEmail(email: unknown) {
	return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function isAuthUserRegistered(email: string) {
	const rows = await prisma.$queryRaw<{ id: string }[]>`
		SELECT id
		FROM auth.users
		WHERE lower(email) = ${email}
		LIMIT 1
	`;

	return Array.isArray(rows) && rows.length > 0;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { email, password } = body ?? {};

		const normalizedEmail = normalizeEmail(email);

		if (!normalizedEmail || typeof password !== 'string') {
			return NextResponse.json({ error: 'Permintaan tidak sah.' }, { status: 400 });
		}

		// 1) Check account existence first (auth.users)
		const exists = await isAuthUserRegistered(normalizedEmail);

		if (!exists) {
			return NextResponse.json({ error: 'Akaun tidak ditemui.' }, { status: 404 });
		}

		// 2) Verify password using Supabase sign-in
		const { data, error } = await supabase.auth.signInWithPassword({
			email: normalizedEmail,
			password,
		});

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 401 });
		}

		const response = NextResponse.json({
			message: "Log masuk berjaya.",
			user: data.user,
		});

		// Store the auth token in a cookie so middleware can recognize the logged-in user.
		if (data.session?.access_token) {
			response.cookies.set({
				name: SESSION_COOKIE_NAME,
				value: data.session.access_token,
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				path: "/",
				maxAge: data.session.expires_in ?? 60 * 60,
			});
		}

		return response;
	} catch (error: unknown) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Gagal log masuk." },
			{ status: 500 }
		);
	}
}
