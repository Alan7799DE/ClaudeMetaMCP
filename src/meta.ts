import "dotenv/config";

const TOKEN = process.env.META_ACCESS_TOKEN ?? "";
const VERSION = process.env.META_GRAPH_VERSION ?? "v26.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export interface Env {
  igUserId: string;
  adAccountId: string;
}

export function getEnv(): Env {
  return {
    igUserId: process.env.IG_USER_ID ?? "",
    adAccountId: process.env.AD_ACCOUNT_ID ?? "",
  };
}

export function assertToken(): void {
  if (!TOKEN) {
    throw new Error(
      "Falta META_ACCESS_TOKEN en el .env. Completá el archivo antes de usar el MCP.",
    );
  }
}

type Params = Record<string, string | number | boolean | undefined>;

/** GET a la Graph API. `token` permite usar otro token (ej. el de una Página). */
export async function graphGet(
  path: string,
  params: Params = {},
  token?: string,
): Promise<any> {
  assertToken();
  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("access_token", token ?? TOKEN);
  const res = await fetch(url.toString());
  return handle(res);
}

/** POST a la Graph API (form-urlencoded). `token` permite usar otro token. */
export async function graphPost(
  path: string,
  params: Params = {},
  token?: string,
): Promise<any> {
  assertToken();
  const url = `${BASE}/${path.replace(/^\//, "")}`;
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, String(v));
  }
  body.set("access_token", token ?? TOKEN);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return handle(res);
}

async function handle(res: Response): Promise<any> {
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data?.error) {
    const err = data?.error;
    const msg = err
      ? `Error de Meta (${err.code}/${err.error_subcode ?? "-"}): ${err.message}`
      : `HTTP ${res.status}: ${text}`;
    throw new Error(msg);
  }
  return data;
}

/** Espera para no golpear la API mientras un video se procesa. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
