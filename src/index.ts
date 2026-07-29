#!/usr/bin/env node
/**
 * Servidor MCP local para operar Instagram y Meta Ads de Niveals.
 * Transporte: stdio (lo lanza Claude Code).
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  publicarInstagram,
  listarPublicaciones,
  publicarCarrusel,
  insightsCuenta,
  insightsPublicacion,
  listarComentarios,
  responderComentario,
} from "./instagram.js";
import {
  listarCampanias,
  crearCampania,
  setEstadoCampania,
  metricasCampania,
  metricasBreakdown,
  actualizarCampania,
  duplicarCampania,
  crearAdSet,
  crearCreative,
  crearAd,
} from "./ads.js";
import {
  publicarEnPagina,
  listarPostsPagina,
} from "./facebook.js";

const server = new McpServer({
  name: "niveals-meta-mcp",
  version: "0.1.0",
});

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const fail = (e: unknown) => ({
  content: [{ type: "text" as const, text: `❌ ${(e as Error).message}` }],
  isError: true,
});

// ---------- Instagram ----------

server.tool(
  "publicar_instagram",
  "Publica en el feed de Instagram de Niveals una imagen o un reel (video). No publica Stories (la API no lo permite).",
  {
    caption: z.string().optional().describe("Texto/caption del post."),
    imageUrl: z
      .string()
      .url()
      .optional()
      .describe("URL pública de la imagen (JPEG). Usar imageUrl O videoUrl."),
    videoUrl: z
      .string()
      .url()
      .optional()
      .describe("URL pública del video para reel. Usar imageUrl O videoUrl."),
  },
  async (args) => {
    try {
      return ok(await publicarInstagram(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "listar_publicaciones_instagram",
  "Lista las últimas publicaciones de la cuenta de Instagram de Niveals.",
  { limit: z.number().int().min(1).max(50).optional() },
  async ({ limit }) => {
    try {
      return ok(await listarPublicaciones(limit ?? 10));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "publicar_carrusel_instagram",
  "Publica un carrusel (2 a 10 imágenes) en el feed de Instagram de Niveals.",
  {
    caption: z.string().optional(),
    imageUrls: z
      .array(z.string().url())
      .min(2)
      .max(10)
      .describe("URLs públicas de las imágenes (2 a 10)."),
  },
  async (args) => {
    try {
      return ok(await publicarCarrusel(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "insights_cuenta_instagram",
  "Insights orgánicos de la cuenta de Instagram (alcance, seguidores, profile views, etc.).",
  {
    metric: z
      .string()
      .optional()
      .describe("Métrica(s), ej. reach, follower_count, profile_views. Default reach."),
    period: z.string().optional().describe("day | week | days_28. Default day."),
    metricType: z
      .string()
      .optional()
      .describe("Algunas métricas nuevas requieren 'total_value'."),
  },
  async (args) => {
    try {
      return ok(await insightsCuenta(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "insights_publicacion_instagram",
  "Insights de una publicación puntual de Instagram (alcance, guardados, interacción, etc.).",
  {
    mediaId: z.string().describe("ID de la publicación."),
    metric: z.string().optional().describe("Métricas separadas por coma."),
  },
  async ({ mediaId, metric }) => {
    try {
      return ok(await insightsPublicacion(mediaId, metric));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "listar_comentarios_instagram",
  "Lista los comentarios de una publicación de Instagram.",
  {
    mediaId: z.string().describe("ID de la publicación."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  async ({ mediaId, limit }) => {
    try {
      return ok(await listarComentarios(mediaId, limit ?? 25));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "responder_comentario_instagram",
  "Responde a un comentario de Instagram. ⚠️ Publica una respuesta visible; confirmá el texto con el usuario.",
  {
    commentId: z.string().describe("ID del comentario a responder."),
    message: z.string().describe("Texto de la respuesta."),
  },
  async ({ commentId, message }) => {
    try {
      return ok(await responderComentario(commentId, message));
    } catch (e) {
      return fail(e);
    }
  },
);

// ---------- Meta Ads ----------

server.tool(
  "listar_campanias",
  "Lista las campañas de la cuenta publicitaria de Meta Ads de Niveals.",
  { limit: z.number().int().min(1).max(100).optional() },
  async ({ limit }) => {
    try {
      return ok(await listarCampanias(limit ?? 25));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "crear_campania",
  "Crea una campaña de Meta Ads. Se crea SIEMPRE en PAUSED (no gasta hasta que la actives con activar_campania).",
  {
    name: z.string().describe("Nombre de la campaña."),
    objective: z
      .string()
      .describe(
        "Objetivo, p.ej. OUTCOME_TRAFFIC, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_LEADS.",
      ),
    dailyBudget: z
      .number()
      .int()
      .optional()
      .describe("Presupuesto diario en CENTAVOS de la moneda de la cuenta (ej. 5000 = $50)."),
  },
  async (args) => {
    try {
      return ok(await crearCampania(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "pausar_campania",
  "Pausa una campaña de Meta Ads (deja de gastar).",
  { campaignId: z.string().describe("ID de la campaña.") },
  async ({ campaignId }) => {
    try {
      return ok(await setEstadoCampania(campaignId, "PAUSED"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "activar_campania",
  "Activa (ACTIVE) una campaña de Meta Ads. ⚠️ Empieza a gastar presupuesto. Confirmá con el usuario antes de llamarla.",
  { campaignId: z.string().describe("ID de la campaña.") },
  async ({ campaignId }) => {
    try {
      return ok(await setEstadoCampania(campaignId, "ACTIVE"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "metricas_campania",
  "Devuelve métricas (impresiones, clicks, CTR, CPC, gasto, etc.) de una campaña.",
  {
    campaignId: z.string().describe("ID de la campaña."),
    datePreset: z
      .string()
      .optional()
      .describe("Rango: today, yesterday, last_7d, last_30d, this_month, maximum. Default last_7d."),
  },
  async ({ campaignId, datePreset }) => {
    try {
      return ok(await metricasCampania(campaignId, datePreset ?? "last_7d"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "metricas_breakdown_ads",
  "Métricas de ads con desglose por edad, género, ubicación, plataforma, etc. Funciona a nivel campaña, ad set, ad o cuenta (act_...).",
  {
    objectId: z.string().describe("ID de campaña, ad set, ad, o act_... para toda la cuenta."),
    breakdowns: z
      .string()
      .describe("Desglose(s), ej. 'age,gender', 'region', 'publisher_platform', 'country'."),
    datePreset: z.string().optional().describe("Default last_7d."),
  },
  async (args) => {
    try {
      return ok(await metricasBreakdown(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "actualizar_campania",
  "Edita una campaña existente sin recrearla: nombre, estado y/o presupuesto diario/total (en centavos).",
  {
    campaignId: z.string(),
    name: z.string().optional(),
    status: z.enum(["PAUSED", "ACTIVE"]).optional(),
    dailyBudget: z.number().int().optional().describe("Centavos."),
    lifetimeBudget: z.number().int().optional().describe("Centavos."),
  },
  async ({ campaignId, ...cambios }) => {
    try {
      return ok(await actualizarCampania(campaignId, cambios));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "duplicar_campania",
  "Clona una campaña existente (con sus ad sets y ads). La copia se crea en PAUSED.",
  {
    campaignId: z.string(),
    deepCopy: z
      .boolean()
      .optional()
      .describe("true (default) copia también ad sets y ads."),
  },
  async ({ campaignId, deepCopy }) => {
    try {
      return ok(await duplicarCampania(campaignId, deepCopy ?? true));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "crear_ad_set",
  "Crea un ad set (segmentación + presupuesto + optimización) dentro de una campaña. Se crea en PAUSED.",
  {
    name: z.string(),
    campaignId: z.string(),
    optimizationGoal: z
      .string()
      .describe("ej. LINK_CLICKS, REACH, POST_ENGAGEMENT, OFFSITE_CONVERSIONS."),
    billingEvent: z.string().describe("ej. IMPRESSIONS, LINK_CLICKS."),
    dailyBudget: z.number().int().optional().describe("Centavos."),
    lifetimeBudget: z.number().int().optional().describe("Centavos."),
    bidStrategy: z.string().optional(),
    bidAmount: z.number().int().optional().describe("Centavos, si el bid es con tope."),
    targeting: z
      .record(z.any())
      .optional()
      .describe("Spec completo de segmentación (objeto). Si se omite, usa countries/ageMin/ageMax."),
    countries: z.array(z.string()).optional().describe("Atajo, ej. ['AR']."),
    ageMin: z.number().int().optional(),
    ageMax: z.number().int().optional(),
    promotedObject: z.record(z.any()).optional(),
    startTime: z.string().optional().describe("ISO 8601."),
    endTime: z.string().optional().describe("ISO 8601."),
  },
  async (args) => {
    try {
      return ok(await crearAdSet(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "crear_creative",
  "Crea el creative (contenido del anuncio) desde la Página de Facebook: mensaje + link + imagen. Devuelve creative_id.",
  {
    name: z.string(),
    pageId: z.string().describe("ID de la Página de Facebook."),
    message: z.string(),
    link: z.string().url().optional().describe("URL de destino."),
    imageUrl: z.string().url().optional().describe("URL pública de la imagen."),
    description: z.string().optional(),
    instagramUserId: z
      .string()
      .optional()
      .describe("Para que el anuncio también corra en la cuenta de IG."),
  },
  async (args) => {
    try {
      return ok(await crearCreative(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "crear_ad",
  "Crea el anuncio final uniendo un ad set con un creative. Se crea en PAUSED.",
  {
    name: z.string(),
    adsetId: z.string(),
    creativeId: z.string(),
  },
  async (args) => {
    try {
      return ok(await crearAd(args));
    } catch (e) {
      return fail(e);
    }
  },
);

// ---------- Facebook Page ----------

server.tool(
  "publicar_facebook",
  "Publica en la Página de Facebook de Niveals. Podés programar pasando scheduledPublishTime (entre 10 min y 6 meses en el futuro).",
  {
    message: z.string(),
    link: z.string().url().optional(),
    scheduledPublishTime: z
      .string()
      .optional()
      .describe("Fecha ISO 8601. Si se pasa, el post queda programado en vez de publicarse ya."),
  },
  async (args) => {
    try {
      return ok(await publicarEnPagina(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "listar_posts_facebook",
  "Lista los posts de la Página de Facebook (incluye los programados).",
  { limit: z.number().int().min(1).max(50).optional() },
  async ({ limit }) => {
    try {
      return ok(await listarPostsPagina(limit ?? 10));
    } catch (e) {
      return fail(e);
    }
  },
);

// ---------- arranque ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // No usar console.log en stdio: rompería el protocolo. Se loguea a stderr.
  console.error("niveals-meta-mcp corriendo (stdio).");
}

main().catch((e) => {
  console.error("Fallo al iniciar el MCP:", e);
  process.exit(1);
});
