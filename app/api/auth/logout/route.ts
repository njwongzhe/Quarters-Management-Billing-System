import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/app/constants/auth";

export async function POST() {
	// Clear the session cookie.
	const response = NextResponse.json({
		message: "Logout berhasil.",
	});

	response.cookies.delete(SESSION_COOKIE_NAME);
    
	return response;
}
