import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getSupabaseClient from "../../../../lib/auth/supabaseServer";
import { DOMAIN_RESTRICTION, RESTRICTED_EMAIL_DOMAIN } from "@/app/constants/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthUserRegistrationRow = {
	id: string;
	email_confirmed_at: Date | null;
	confirmed_at: Date | null;
};

function normalizeEmail(email: unknown) {
	return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function isEmailRegistered(email: string) {
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

		// Check domain restriction
		if (DOMAIN_RESTRICTION && !trimmedEmail.endsWith(RESTRICTED_EMAIL_DOMAIN)) {
			return NextResponse.json(
				{ error: `Emel mesti berakhir dengan ${RESTRICTED_EMAIL_DOMAIN}.` },
				{ status: 400 }
			);
		}

		const isRegistered = await isEmailRegistered(trimmedEmail);

		if (!isRegistered) {
			return NextResponse.json(
				{ error: "Akaun dengan emel ini belum didaftarkan." },
				{ status: 404 }
			);
		}

		const supabase = getSupabaseClient();

		// Send password reset OTP/email using the recovery flow.
		const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "OTP berjaya dihantar." });
	} catch (error: unknown) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

