// This file contains constants related to authentication that are used on the server side (e.g., in API routes and middleware). 
// This separation allows us to avoid importing server-only constants into client-side code, which can help prevent accidental exposure of sensitive information and reduce bundle size.
import "server-only";

// Session cookie names used by the login API, logout API, and middleware.
export const SESSION_COOKIE_NAME = "login_session";

// When you change these values, you need to ensure that you also update the corresponding values in app/constants/auth.ts if you try to update the domain restrictions at ui also.
export const DOMAIN_RESTRICTION_SERVER = false; 
export const RESTRICTED_EMAIL_DOMAIN_SERVER = "@johor.gov.my";