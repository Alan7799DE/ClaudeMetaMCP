import { graphGet, graphPost, getEnv } from "./meta.js";

function adAccount(): string {
  const { adAccountId } = getEnv();
  if (!adAccountId) {
    throw new Error(
      "Falta AD_ACCOUNT_ID en el .env (formato act_XXXXXXXXX).",
    );
  }
  return adAccountId;
}

/** Lista campañas de la cuenta publicitaria. */
export async function listarCampanias(limit = 25): Promise<any[]> {
  const res = await graphGet(`${adAccount()}/campaigns`, {
    fields:
      "id,name,status,objective,effective_status,daily_budget,lifetime_budget,created_time",
    limit,
  });
  return res.data ?? [];
}

/**
 * Crea una campaña. Por seguridad se crea SIEMPRE en PAUSED:
 * nada empieza a gastar hasta que la actives explícitamente.
 */
export async function crearCampania(input: {
  name: string;
  objective: string; // p.ej. OUTCOME_TRAFFIC, OUTCOME_SALES, OUTCOME_ENGAGEMENT
  dailyBudget?: number; // en centavos de la moneda de la cuenta
}): Promise<{ id: string }> {
  const params: Record<string, string | number> = {
    name: input.name,
    objective: input.objective,
    status: "PAUSED",
    special_ad_categories: "[]",
  };
  if (input.dailyBudget !== undefined) params.daily_budget = input.dailyBudget;
  const res = await graphPost(`${adAccount()}/campaigns`, params);
  return { id: res.id };
}

/** Cambia el estado de una campaña (PAUSED / ACTIVE). */
export async function setEstadoCampania(
  campaignId: string,
  status: "PAUSED" | "ACTIVE",
): Promise<{ success: boolean }> {
  const res = await graphPost(campaignId, { status });
  return { success: res.success ?? true };
}

/** Métricas (insights) de una campaña. */
export async function metricasCampania(
  campaignId: string,
  datePreset = "last_7d",
): Promise<any[]> {
  const res = await graphGet(`${campaignId}/insights`, {
    fields: "impressions,reach,clicks,ctr,cpc,cpm,spend,actions",
    date_preset: datePreset,
  });
  return res.data ?? [];
}

/**
 * Métricas con desglose (breakdown): gasto/impresiones/etc. por edad, género,
 * ubicación, plataforma, etc. Funciona a nivel campaña, ad set, ad o cuenta.
 */
export async function metricasBreakdown(input: {
  objectId: string; // id de campaña, ad set, ad, o act_... para toda la cuenta
  breakdowns: string; // ej. "age,gender", "region", "publisher_platform"
  datePreset?: string;
}): Promise<any[]> {
  const res = await graphGet(`${input.objectId}/insights`, {
    fields: "impressions,reach,clicks,ctr,cpc,cpm,spend,actions",
    breakdowns: input.breakdowns,
    date_preset: input.datePreset ?? "last_7d",
  });
  return res.data ?? [];
}

/** Actualiza presupuesto y/o nombre/estado de una campaña (sin recrearla). */
export async function actualizarCampania(
  campaignId: string,
  cambios: {
    name?: string;
    status?: "PAUSED" | "ACTIVE";
    dailyBudget?: number; // centavos
    lifetimeBudget?: number; // centavos
  },
): Promise<{ success: boolean }> {
  const params: Record<string, string | number> = {};
  if (cambios.name !== undefined) params.name = cambios.name;
  if (cambios.status !== undefined) params.status = cambios.status;
  if (cambios.dailyBudget !== undefined) params.daily_budget = cambios.dailyBudget;
  if (cambios.lifetimeBudget !== undefined) params.lifetime_budget = cambios.lifetimeBudget;
  if (Object.keys(params).length === 0) {
    throw new Error("No pasaste ningún cambio.");
  }
  const res = await graphPost(campaignId, params);
  return { success: res.success ?? true };
}

/**
 * Duplica una campaña existente (con sus ad sets y ads). La copia se crea
 * en PAUSED para que no gaste hasta revisarla.
 */
export async function duplicarCampania(
  campaignId: string,
  deepCopy = true,
): Promise<any> {
  return graphPost(`${campaignId}/copies`, {
    deep_copy: deepCopy,
    status_option: "PAUSED",
  });
}

/**
 * Crea un ad set (segmentación + presupuesto + optimización) dentro de una campaña.
 * Se crea en PAUSED. La segmentación se puede pasar como objeto `targeting`
 * completo, o con los atajos countries/ageMin/ageMax.
 */
export async function crearAdSet(input: {
  name: string;
  campaignId: string;
  optimizationGoal: string; // ej. LINK_CLICKS, REACH, POST_ENGAGEMENT, OFFSITE_CONVERSIONS
  billingEvent: string; // ej. IMPRESSIONS, LINK_CLICKS
  dailyBudget?: number; // centavos
  lifetimeBudget?: number; // centavos
  bidStrategy?: string; // ej. LOWEST_COST_WITHOUT_CAP
  bidAmount?: number; // centavos (si el bid es con tope)
  targeting?: Record<string, unknown>; // spec completo de segmentación
  countries?: string[]; // atajo: ["AR"]
  ageMin?: number;
  ageMax?: number;
  promotedObject?: Record<string, unknown>; // requerido por algunos objetivos
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
}): Promise<{ id: string }> {
  let targeting = input.targeting;
  if (!targeting) {
    targeting = {
      geo_locations: { countries: input.countries ?? ["AR"] },
      ...(input.ageMin ? { age_min: input.ageMin } : {}),
      ...(input.ageMax ? { age_max: input.ageMax } : {}),
    };
  }

  const params: Record<string, string | number> = {
    name: input.name,
    campaign_id: input.campaignId,
    optimization_goal: input.optimizationGoal,
    billing_event: input.billingEvent,
    bid_strategy: input.bidStrategy ?? "LOWEST_COST_WITHOUT_CAP",
    status: "PAUSED",
    targeting: JSON.stringify(targeting),
  };
  if (input.dailyBudget !== undefined) params.daily_budget = input.dailyBudget;
  if (input.lifetimeBudget !== undefined) params.lifetime_budget = input.lifetimeBudget;
  if (input.bidAmount !== undefined) params.bid_amount = input.bidAmount;
  if (input.promotedObject) params.promoted_object = JSON.stringify(input.promotedObject);
  if (input.startTime) params.start_time = input.startTime;
  if (input.endTime) params.end_time = input.endTime;

  const res = await graphPost(`${adAccount()}/adsets`, params);
  return { id: res.id };
}

/**
 * Crea un creative (el "contenido" del anuncio) a partir de una Página de
 * Facebook: mensaje + link + imagen. Devuelve el creative_id para usar en crearAd.
 */
export async function crearCreative(input: {
  name: string;
  pageId: string;
  message: string;
  link?: string;
  imageUrl?: string;
  description?: string;
  instagramUserId?: string; // para que el anuncio también corra en IG
}): Promise<{ id: string }> {
  const linkData: Record<string, unknown> = { message: input.message };
  if (input.link) linkData.link = input.link;
  if (input.imageUrl) linkData.picture = input.imageUrl;
  if (input.description) linkData.description = input.description;

  const storySpec: Record<string, unknown> = {
    page_id: input.pageId,
    link_data: linkData,
  };
  if (input.instagramUserId) storySpec.instagram_actor_id = input.instagramUserId;

  const res = await graphPost(`${adAccount()}/adcreatives`, {
    name: input.name,
    object_story_spec: JSON.stringify(storySpec),
  });
  return { id: res.id };
}

/** Crea el anuncio (une un ad set con un creative). Se crea en PAUSED. */
export async function crearAd(input: {
  name: string;
  adsetId: string;
  creativeId: string;
}): Promise<{ id: string }> {
  const res = await graphPost(`${adAccount()}/ads`, {
    name: input.name,
    adset_id: input.adsetId,
    creative: JSON.stringify({ creative_id: input.creativeId }),
    status: "PAUSED",
  });
  return { id: res.id };
}
