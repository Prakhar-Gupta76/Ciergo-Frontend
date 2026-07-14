type RequiredEnvironmentVariable = "VITE_API_URL" | "VITE_DEMO_EMAIL" | "VITE_DEMO_PASSWORD";

function requiredEnvironmentVariable(name: RequiredEnvironmentVariable): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required in frontend/.env. Restart the Vite development server after changing environment variables.`);
  }
  return value;
}

const API_URL = requiredEnvironmentVariable("VITE_API_URL");
const DEMO_EMAIL = requiredEnvironmentVariable("VITE_DEMO_EMAIL");
const DEMO_PASSWORD = requiredEnvironmentVariable("VITE_DEMO_PASSWORD");

let accessToken: string | null = sessionStorage.getItem("ciergo_access_token");
let loginPromise: Promise<void> | null = null;

async function demoLogin(): Promise<void> {
  if (loginPromise) return loginPromise;
  loginPromise = fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Unable to sign in to the demo backend");
    const token = body.data?.accessToken;
    if (typeof token !== "string" || token.length === 0) throw new Error("The login response did not contain an access token");
    accessToken = token;
    sessionStorage.setItem("ciergo_access_token", token);
  }).finally(() => { loginPromise = null; });
  return loginPromise;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!accessToken && !path.startsWith("/auth/")) await demoLogin();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    accessToken = null;
    sessionStorage.removeItem("ciergo_access_token");
    await demoLogin();
    return api<T>(path, init, false);
  }
  const body = await response.json().catch(() => ({ message: "Unexpected server response" }));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body as T;
}

export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
