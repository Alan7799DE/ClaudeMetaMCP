/**
 * Diagnóstico: verifica el token y te muestra las cuentas de Instagram
 * y las ad accounts a las que tenés acceso, para completar el .env.
 *
 * Uso:  npm run check
 */
import { graphGet, getEnv } from "./meta.js";

async function main() {
  console.log("🔎 Verificando token de Meta...\n");

  // ¿A quién pertenece el token?
  const me = await graphGet("me", { fields: "id,name" });
  console.log(`Token OK. Identidad: ${me.name} (${me.id})\n`);

  // Páginas de Facebook y su cuenta de Instagram vinculada.
  try {
    const pages = await graphGet("me/accounts", {
      fields: "id,name,instagram_business_account{id,username}",
      limit: 50,
    });
    console.log("📄 Páginas / Instagram vinculado:");
    for (const p of pages.data ?? []) {
      const ig = p.instagram_business_account;
      console.log(
        `  - Página: ${p.name} (${p.id})` +
          (ig ? `  →  IG: @${ig.username}  IG_USER_ID=${ig.id}` : "  (sin IG vinculado)"),
      );
    }
    if (!pages.data?.length) console.log("  (ninguna)");
  } catch (e) {
    console.log(`  No se pudieron listar páginas: ${(e as Error).message}`);
  }

  // Ad accounts.
  try {
    const acts = await graphGet("me/adaccounts", {
      fields: "id,name,account_status,currency",
      limit: 50,
    });
    console.log("\n💰 Cuentas publicitarias:");
    for (const a of acts.data ?? []) {
      console.log(`  - ${a.name} (${a.id})  moneda=${a.currency}`);
    }
    if (!acts.data?.length) console.log("  (ninguna)");
  } catch (e) {
    console.log(`  No se pudieron listar ad accounts: ${(e as Error).message}`);
  }

  const env = getEnv();
  console.log("\n📝 .env actual:");
  console.log(`  IG_USER_ID=${env.igUserId || "(vacío)"}`);
  console.log(`  AD_ACCOUNT_ID=${env.adAccountId || "(vacío)"}`);
  console.log(
    "\nCopiá el IG_USER_ID y el ad account (act_...) de arriba al archivo .env.",
  );
}

main().catch((e) => {
  console.error("\n❌", (e as Error).message);
  process.exit(1);
});
