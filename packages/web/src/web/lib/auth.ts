import { createAuthClient } from 'better-auth/react';
import { managedAuthClient } from '@runablehq/managed-auth/client';
const TOKEN_KEY = 'cinestream.email-session';
export function getEmailToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function clearEmailToken() { localStorage.removeItem(TOKEN_KEY); }
export function captureEmailToken(context: { response: Response }) {
  const token = context.response.headers.get('set-auth-token');
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  fetchOptions: { auth: { type: 'Bearer', token: getEmailToken } },
  plugins: [managedAuthClient({ applicationId: import.meta.env.VITE_APPLICATION_ID, issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER })],
});