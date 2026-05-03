import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/app/constants/auth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
	const sessionToken = request.headers
		.get("cookie")
		?.split(";")
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
		?.slice(SESSION_COOKIE_NAME.length + 1);

	let supabaseLogoutError: string | null = null;

	if (sessionToken) {
		try {
			const supabase = getSupabaseAdminClient();
			const { error } = await supabase.auth.admin.signOut(sessionToken, "global");

			if (error) {
				supabaseLogoutError = error.message;
			}
		} catch (error) {
			supabaseLogoutError = error instanceof Error ? error.message : "Supabase logout request could not be completed.";
		}
	}

	const response = NextResponse.json({
		message: "Logout berhasil.",
		...(supabaseLogoutError ? { warning: supabaseLogoutError } : {}),
	});

	response.cookies.delete(SESSION_COOKIE_NAME);

	return response;
}
