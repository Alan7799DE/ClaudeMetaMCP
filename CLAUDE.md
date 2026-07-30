# CLAUDE.md — ClaudeMetaMCP

Contexto para Claude Code al trabajar en este proyecto.

## ⛔ REGLA INQUEBRANTABLE — Aprobación explícita del usuario

**NADA se publica, se programa, ni se activa/gasta sin aprobación explícita del usuario
en el momento.** No hay excepciones, ni "publicaciones de prueba", ni "para verificar que
funciona", ni aprobación general anticipada: la aprobación es **por acción y por vez**.

Requieren confirmar con el usuario ANTES de ejecutar — mostrándole exactamente qué se va a
publicar/activar (texto, imagen/URL, cuenta, fecha, presupuesto):

- `publicar_instagram` — publica en el feed
- `publicar_carrusel_instagram` — publica un carrusel
- `publicar_facebook` — publica **o programa** en la Página
- `responder_comentario_instagram` — publica una respuesta visible
- `activar_campania` — enciende una campaña (empieza a gastar)
- `actualizar_campania` con `status: ACTIVE` — mismo efecto: enciende una campaña

Programar **es** publicar a futuro: cae bajo la misma regla. Que una acción sea reversible
no exime de pedir aprobación. Preparar borradores, crear campañas/ads en PAUSED, leer
métricas o listar cosas está permitido sin aprobación previa — lo que no se puede es
**disparar la publicación o el gasto** sin el OK explícito del usuario.

## Qué es

Servidor **MCP local en TypeScript** que expone la Graph API de Meta (v26.0) como
herramientas para operar, desde Claude Code, los activos comerciales de **Niveals**:
Instagram (`@niveals.dev`), Meta Ads y la Página de Facebook.

Repo público: https://github.com/Alan7799DE/ClaudeMetaMCP
El servidor corre local vía stdio; el token y los IDs viven solo en `.env` (nunca se versiona).

## Arquitectura

```
src/
  meta.ts       Cliente HTTP de la Graph API: graphGet / graphPost (+ override de token).
                Toda llamada pasa por acá. Lee TOKEN y VERSION del .env.
  instagram.ts  Publicar (imagen/reel/carrusel), insights, comentarios.
  ads.ts        Campañas, ad sets, creatives, ads, métricas y breakdowns.
  facebook.ts   Publicar/programar en la Página (usa Page Access Token, no el de usuario).
  index.ts      Registra las 20 tools del MCP (nombres en español) y arranca stdio.
  check.ts      Script de diagnóstico: valida el token y lista IDs disponibles.
```

Flujo de datos: `index.ts` (tool) → función de dominio (`instagram/ads/facebook`) →
`graphGet/graphPost` en `meta.ts` → Graph API.

## Comandos

```bash
npm install
npm run build   # tsc -> dist/
npm run check   # valida token y lista páginas/IG/ad accounts accesibles
npm run dev     # corre el MCP con tsx sin compilar
```

Después de editar código: `npm run build` (el .mcp.json apunta a `dist/index.js`).

## Convenciones del proyecto

- **Idioma:** nombres de tools, parámetros y comentarios en **español** (rioplatense).
  Mantener ese estilo al agregar cosas.
- **Nombres de tools:** `verbo_objeto` en snake_case, ej. `crear_ad_set`, `metricas_campania`.
- **Cada tool** envuelve la llamada en try/catch y devuelve con los helpers `ok()` / `fail()`
  de `index.ts`. Seguir ese patrón.
- **Validación:** schemas con Zod en el registro de cada tool.
- **Errores de Meta:** se formatean en `handle()` de `meta.ts` (código + mensaje). No
  tragarse errores.

## Reglas de negocio que NO se deben romper

- **Ads siempre en PAUSED al crear** (`crear_campania`, `crear_ad_set`, `crear_ad`).
  Nada gasta hasta un `activar_campania` explícito. Antes de activar o de cualquier acción
  que gaste presupuesto, **confirmar con el usuario**.
- **Presupuestos en centavos** de la moneda de la cuenta (ej. 5000 = 50 ARS).
- **Instagram:** solo feed / reels / carruseles. **No** Stories (la API no lo permite).
  Imágenes y videos deben estar en una **URL pública** accesible por Meta.
- **Facebook:** publicar requiere el Page Access Token (se deriva en `facebook.ts`, no usar
  el de usuario). La programación va entre 10 min y 6 meses en el futuro.

## Cómo se mantiene (decisión del usuario)

El usuario **NO** quiere una "escape hatch" genérica (graph_get/graph_post crudos).
Prefiere que las actualizaciones se hagan **hablando conmigo**: cuando Meta cambie algo o
saque una función nueva, él lo comenta y agregamos/ajustamos la tool específica a mano.
Al agregar features nuevas:
1. Función de dominio en el archivo que corresponda (`instagram/ads/facebook.ts`).
2. Registrar la tool en `index.ts` con su schema Zod.
3. `npm run build` y, si se puede, probar contra la API real (solo lectura o en PAUSED).
4. Commit + push al repo.

## Versionado de la Graph API

`META_GRAPH_VERSION` en `.env` (hoy `v26.0`). Meta no rompe versiones publicadas; para
adoptar una versión nueva, cambiar ese valor y revisar si algún campo cambió.

## Seguridad / lo que nunca se versiona

- `.env` (token + IDs reales) y `.mcp.json` (path local) están en `.gitignore`.
- El repo es **público**: no hardcodear tokens ni IDs reales de negocio en código,
  README ni ejemplos. Usar los `.example`.
- Antes de commitear, verificar que no se cuele ningún token (`EAA...`) ni IDs reales.

## Estado actual

Token en uso: Usuario del Sistema ("mcp claude") con todos los permisos necesarios
concedidos (publicar IG, insights, comentarios, publicar en Página, ads). Las 20 tools
están operativas y probadas contra la API real.
