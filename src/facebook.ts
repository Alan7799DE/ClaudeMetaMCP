import { graphGet, graphPost } from "./meta.js";

const FB_PAGE_ID = process.env.FB_PAGE_ID ?? "";

function pageId(): string {
  if (!FB_PAGE_ID) {
    throw new Error("Falta FB_PAGE_ID en el .env (ID de la Página de Facebook).");
  }
  return FB_PAGE_ID;
}

/**
 * Obtiene el Page Access Token de la Página (distinto del token de usuario).
 * Publicar en una Página requiere este token; lo derivamos del token de usuario.
 */
async function pageToken(): Promise<string> {
  const res = await graphGet(`${pageId()}`, { fields: "access_token" });
  if (!res.access_token) {
    throw new Error(
      "No se pudo obtener el Page Access Token. Revisá permisos (pages_manage_posts, pages_read_engagement).",
    );
  }
  return res.access_token;
}

/**
 * Publica en la Página de Facebook. A diferencia de Instagram, Facebook SÍ
 * permite programar: pasá `scheduledPublishTime` (fecha ISO, entre 10 min y
 * 6 meses en el futuro) y el post queda agendado.
 */
export async function publicarEnPagina(input: {
  message: string;
  link?: string;
  scheduledPublishTime?: string; // ISO 8601; si se pasa, se programa
}): Promise<{ id: string; scheduled: boolean }> {
  const token = await pageToken();
  const params: Record<string, string | number | boolean> = {
    message: input.message,
  };
  if (input.link) params.link = input.link;

  let scheduled = false;
  if (input.scheduledPublishTime) {
    const unix = Math.floor(new Date(input.scheduledPublishTime).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    if (unix < now + 600) {
      throw new Error("La fecha programada debe ser al menos 10 minutos en el futuro.");
    }
    params.published = false;
    params.scheduled_publish_time = unix;
    scheduled = true;
  }

  // Publicar en la Página requiere el Page Access Token, no el de usuario.
  const res = await graphPost(`${pageId()}/feed`, params, token);
  return { id: res.id, scheduled };
}

/** Lista los posts de la Página (incluye los programados si published=false). */
export async function listarPostsPagina(limit = 10): Promise<any[]> {
  const token = await pageToken();
  const res = await graphGet(
    `${pageId()}/feed`,
    {
      fields: "id,message,created_time,is_published,scheduled_publish_time,permalink_url",
      limit,
    },
    token,
  );
  return res.data ?? [];
}
