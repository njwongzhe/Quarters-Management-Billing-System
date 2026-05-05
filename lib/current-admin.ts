import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { SESSION_COOKIE_NAME } from "@/app/constants/auth-server";
import { prisma } from "@/lib/prisma";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getCurrentSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
}

export async function getCurrentAdmin() {
  const token = await getCurrentSessionToken();

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const profile = await prisma.adminProfile.findUnique({
    where: {
      id: data.user.id,
    },
  });

  return profile
    ? {
        token,
        user: data.user,
        profile,
      }
    : null;
}
