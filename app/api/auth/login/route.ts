import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { SESSION_COOKIE_NAME } from "@/app/constants/auth";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { email, password } = body ?? {};

		// Let Supabase handle login validation and return any auth errors.
		const { data, error } = await supabase.auth.signInWithPassword({
			email: email.trim(),
			password,
		});

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
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
