import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { SESSION_COOKIE_NAME } from "./app/constants/auth-server";
import { ROUTES } from "./app/constants/routes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // Middleware only validates incoming cookies, so it should not manage browser sessions.
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Accept the current cookie name and the previous one so existing sessions can be cleaned up safely.
function getSessionToken(request: NextRequest) {
  return (
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    ""
  );
}

// Always delete both cookie names when a session is invalid or the user logs out.
function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

// Ask Supabase Auth to validate the token instead of trusting that a cookie exists.
async function hasValidSession(token: string) {
  if (!token || !supabase) return false;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}

// Browser page requests should be sent back to the authentication page.
function redirectToAuth(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = ROUTES.auth;
  redirectUrl.search = "";

  return clearSessionCookies(NextResponse.redirect(redirectUrl));
}

// Logged-in users should not see the login/register page again.
function redirectToHome(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = ROUTES.home;
  redirectUrl.search = "";

  return NextResponse.redirect(redirectUrl);
}

// API callers need a JSON 401 instead of an HTML redirect response.
function unauthorizedApiResponse() {
  return clearSessionCookies(
    NextResponse.json(
      { error: "Sesi tamat tempoh. Sila log masuk semula." },
      { status: 401 }
    )
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith(ROUTES.auth); // Matches /auth, /auth/login, /auth/register, etc.
  const isAuthApiRoute = pathname.startsWith(ROUTES.authApi); // Matches /api/auth/login, /api/auth/register, etc.
  const isApiRoute = pathname.startsWith("/api"); // Matches all API routes, including auth APIs
  const sessionToken = getSessionToken(request); 

  // If the request is for an auth API route, let it handle its own authentication and error responses.
  if (isAuthApiRoute)
    return NextResponse.next();

  // If a valid user reaches the auth page, move them to the app; otherwise clear stale cookies.
  if (isAuthRoute) {
    const isSessionValid = await hasValidSession(sessionToken);

    // If they have a valid session, they don't need to see the login/register page again.
    if (isSessionValid)
      return redirectToHome(request);

    // If they don't have a valid session but have an old cookie, clear it to prevent confusion.
    return sessionToken
      ? clearSessionCookies(NextResponse.next())
      : NextResponse.next();
  }

  // For any other protected route, check authentication and either continue or redirect to login.
  const isProtectedRoute = pathname === ROUTES.home || pathname.startsWith(ROUTES.pagesRoot) || isApiRoute;

  // If the route is not protected, we don't care if they have a valid session or not.
  if (!isProtectedRoute)
    return NextResponse.next();

  // Protected pages and APIs require a token that Supabase still accepts.
  const isSessionValid = await hasValidSession(sessionToken);

  // If they have a valid session, they can see the page or call the API as normal.
  if (isSessionValid)
    return NextResponse.next();

  return isApiRoute ? unauthorizedApiResponse() : redirectToAuth(request);
}

export const config = {
  matcher: ["/", "/pages/:path*", "/api/:path*"],
};
