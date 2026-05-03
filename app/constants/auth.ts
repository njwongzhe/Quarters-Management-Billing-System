// This file contains constants related to authentication that are used on the client side (e.g., in React components). 
// This separation allows us to avoid importing client-side constants into server-side code, which can help prevent accidental exposure of sensitive information and reduce bundle size.

// When you change these values, you need to ensure that you also update the corresponding values in app/constants/auth-server.ts if you try to update the domain restrictions at backend also.
export const DOMAIN_RESTRICTION = false;
export const RESTRICTED_EMAIL_DOMAIN = "@johor.gov.my";