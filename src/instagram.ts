import { graphGet, graphPost, getEnv, sleep } from "./meta.js";

/**
 * Publica en el feed de Instagram (imagen, reel/video o carrusel).
 * Flujo Graph API: crear contenedor(es) -> (esperar procesado si es video) -> publicar.
 */
export async function publicarInstagram(input: {
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<{ mediaId: string; permalink?: string }> {
  const { igUserId } = getEnv();
  if (!igUserId) {
    throw new Error(
      "Falta IG_USER_ID en el .env. Corré `npm run check` para obtenerlo.",
    );
  }
  if (!input.imageUrl && !input.videoUrl) {
    throw new Error("Tenés que pasar imageUrl o videoUrl.");
  }

  // 1) Crear el contenedor de media.
  const containerParams: Record<string, string> = {};
  if (input.caption) containerParams.caption = input.caption;
  if (input.videoUrl) {
    containerParams.media_type = "REELS";
    containerParams.video_url = input.videoUrl;
  } else {
    containerParams.image_url = input.imageUrl!;
  }

  const container = await graphPost(`${igUserId}/media`, containerParams);
  const creationId: string = container.id;

  // 2) Si es video, esperar a que termine de procesarse.
  if (input.videoUrl) {
    await esperarProcesado(creationId);
  }

  // 3) Publicar.
  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
  });
  const mediaId: string = published.id;

  // 4) Intentar traer el permalink (best-effort).
  let permalink: string | undefined;
  try {
    const info = await graphGet(mediaId, { fields: "permalink" });
    permalink = info.permalink;
  } catch {
    /* opcional */
  }

  return { mediaId, permalink };
}

async function esperarProcesado(creationId: string): Promise<void> {
  const maxIntentos = 30; // ~5 min a 10s
  for (let i = 0; i < maxIntentos; i++) {
    const status = await graphGet(creationId, { fields: "status_code" });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new Error("Meta reportó ERROR procesando el video.");
    }
    await sleep(10_000);
  }
  throw new Error(
    "Timeout esperando el procesado del video (probá de nuevo en un rato).",
  );
}

/** Lista las últimas publicaciones de la cuenta de Instagram. */
export async function listarPublicaciones(limit = 10): Promise<any[]> {
  const { igUserId } = getEnv();
  if (!igUserId) throw new Error("Falta IG_USER_ID en el .env.");
  const res = await graphGet(`${igUserId}/media`, {
    fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
    limit,
  });
  return res.data ?? [];
}

/**
 * Publica un carrusel (2 a 10 imágenes) en el feed de Instagram.
 * Flujo: crear un contenedor hijo por cada imagen -> crear el contenedor
 * padre (CAROUSEL) con los hijos -> publicar.
 */
export async function publicarCarrusel(input: {
  caption?: string;
  imageUrls: string[];
}): Promise<{ mediaId: string; permalink?: string }> {
  const { igUserId } = getEnv();
  if (!igUserId) throw new Error("Falta IG_USER_ID en el .env.");
  const urls = input.imageUrls ?? [];
  if (urls.length < 2 || urls.length > 10) {
    throw new Error("Un carrusel necesita entre 2 y 10 imágenes.");
  }

  // 1) Contenedor por cada imagen.
  const childIds: string[] = [];
  for (const url of urls) {
    const child = await graphPost(`${igUserId}/media`, {
      image_url: url,
      is_carousel_item: "true",
    });
    childIds.push(child.id);
  }

  // 2) Contenedor padre.
  const parentParams: Record<string, string> = {
    media_type: "CAROUSEL",
    children: childIds.join(","),
  };
  if (input.caption) parentParams.caption = input.caption;
  const parent = await graphPost(`${igUserId}/media`, parentParams);

  // 3) Publicar.
  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: parent.id,
  });
  const mediaId: string = published.id;

  let permalink: string | undefined;
  try {
    const info = await graphGet(mediaId, { fields: "permalink" });
    permalink = info.permalink;
  } catch {
    /* opcional */
  }
  return { mediaId, permalink };
}

/**
 * Insights de la cuenta de Instagram (alcance, seguidores, etc.).
 * Meta cambia qué métricas están disponibles según la versión; por eso
 * la métrica y el período son configurables.
 */
export async function insightsCuenta(input: {
  metric?: string; // ej. "reach", "follower_count", "profile_views"
  period?: string; // day | week | days_28
  metricType?: string; // algunas métricas nuevas requieren "total_value"
}): Promise<any[]> {
  const { igUserId } = getEnv();
  if (!igUserId) throw new Error("Falta IG_USER_ID en el .env.");
  const params: Record<string, string> = {
    metric: input.metric ?? "reach",
    period: input.period ?? "day",
  };
  if (input.metricType) params.metric_type = input.metricType;
  const res = await graphGet(`${igUserId}/insights`, params);
  return res.data ?? [];
}

/** Insights de una publicación puntual (alcance, guardados, interacción, etc.). */
export async function insightsPublicacion(
  mediaId: string,
  metric = "reach,likes,comments,saved,shares,total_interactions",
): Promise<any[]> {
  const res = await graphGet(`${mediaId}/insights`, { metric });
  return res.data ?? [];
}

/** Lista los comentarios de una publicación. */
export async function listarComentarios(
  mediaId: string,
  limit = 25,
): Promise<any[]> {
  const res = await graphGet(`${mediaId}/comments`, {
    fields: "id,text,username,timestamp,like_count,replies{id,text,username}",
    limit,
  });
  return res.data ?? [];
}

/** Responde a un comentario. */
export async function responderComentario(
  commentId: string,
  message: string,
): Promise<{ id: string }> {
  const res = await graphPost(`${commentId}/replies`, { message });
  return { id: res.id };
}
