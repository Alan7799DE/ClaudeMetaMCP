# ClaudeMetaMCP

Servidor MCP local en TypeScript para operar **Instagram**, **Meta Ads** y **Facebook Page**
desde Claude Code, vía la Graph API de Meta (v26.0).

## Qué hace

20 herramientas expuestas al asistente:

### Instagram

| Herramienta | Qué hace |
|---|---|
| `publicar_instagram` | Publica una imagen o reel en el feed (no Stories). |
| `publicar_carrusel_instagram` | Publica un carrusel de 2 a 10 imágenes. |
| `listar_publicaciones_instagram` | Lista las últimas publicaciones. |
| `insights_cuenta_instagram` | Métricas orgánicas de la cuenta (alcance, seguidores, etc.). |
| `insights_publicacion_instagram` | Métricas de un post puntual (alcance, guardados, interacción). |
| `listar_comentarios_instagram` | Lista los comentarios de una publicación. |
| `responder_comentario_instagram` | Responde a un comentario. |

### Meta Ads

| Herramienta | Qué hace |
|---|---|
| `listar_campanias` | Lista campañas de la cuenta publicitaria. |
| `crear_campania` | Crea una campaña **en PAUSED** (no gasta hasta activarla). |
| `actualizar_campania` | Edita nombre, estado o presupuesto sin recrearla. |
| `pausar_campania` | Pausa una campaña. |
| `activar_campania` | Activa una campaña ⚠️ (empieza a gastar). |
| `duplicar_campania` | Clona una campaña con sus ad sets y ads (copia en PAUSED). |
| `crear_ad_set` | Crea un ad set (segmentación + presupuesto + optimización). |
| `crear_creative` | Crea el contenido del anuncio (mensaje + link + imagen). |
| `crear_ad` | Une un ad set con un creative para armar el anuncio final. |
| `metricas_campania` | Impresiones, clicks, CTR, CPC, gasto, etc. |
| `metricas_breakdown_ads` | Métricas desglosadas por edad, género, ubicación, plataforma. |

### Facebook Page

| Herramienta | Qué hace |
|---|---|
| `publicar_facebook` | Publica en la Página, o la programa (10 min a 6 meses adelante). |
| `listar_posts_facebook` | Lista los posts de la Página, incluidos los programados. |

## Configuración

Copiá `.env.example` a `.env` (el `.env` real está en `.gitignore`, nunca se versiona):

```bash
cp .env.example .env
```

Completá:

```
META_ACCESS_TOKEN=...        # token de la Graph API
META_GRAPH_VERSION=v26.0
IG_USER_ID=...                # ID de la cuenta de Instagram Business/Creator
AD_ACCOUNT_ID=act_...          # ID de la cuenta publicitaria
FB_PAGE_ID=...                 # ID de la Página de Facebook
```

Para descubrir estos IDs a partir de tu token (lista páginas, IG vinculado y ad accounts):

```bash
npm run check
```

## Puesta en marcha

```bash
npm install
npm run build
```

Registrá el servidor en Claude Code (ajustá la ruta a donde clonaste el repo):

```bash
claude mcp add claude-meta-mcp -- node /ruta/a/ClaudeMetaMCP/dist/index.js
```

O agregá un `.mcp.json` en la raíz del proyecto donde lo uses:

```json
{
  "mcpServers": {
    "claude-meta-mcp": {
      "command": "node",
      "args": ["/ruta/a/ClaudeMetaMCP/dist/index.js"]
    }
  }
}
```

## Permisos que necesita el token

| Función | Permiso |
|---|---|
| Publicar en Instagram (feed/reel/carrusel) | `instagram_content_publish` |
| Insights de Instagram | `instagram_manage_insights` |
| Comentarios de Instagram | `instagram_manage_comments` |
| Datos básicos de Instagram | `instagram_basic` |
| Publicar/programar en la Página de Facebook | `pages_manage_posts` |
| Leer la Página | `pages_read_engagement`, `pages_show_list` |
| Meta Ads (campañas, ad sets, creatives, ads, métricas) | `ads_management`, `ads_read` |
| Portfolio comercial | `business_management` |

Verificá qué tiene concedido tu token con `npm run check` o consultando `me/permissions`.
Los permisos de publicación de IG y de Página requieren **Advanced Access** (App Review)
para producción; en desarrollo funcionan si tu usuario es admin/dev de la app, o si operás
sobre activos propios de tu portfolio comercial vía un usuario del sistema.

## Notas importantes

- **Token:** se recomienda un token de larga duración generado desde un **Usuario del
  Sistema** en Business Settings, con los activos (Página, IG, cuenta de ads) asignados.
- **Instagram:** la API solo publica feed / reels / carruseles. **No** publica Stories.
  Las imágenes/videos deben estar en una **URL pública** accesible por Meta.
- **Ads:** las campañas y anuncios se crean siempre en `PAUSED`. Nada gasta presupuesto
  hasta que llamás explícitamente a `activar_campania`. Los presupuestos van en
  **centavos** de la moneda de la cuenta (ej. `5000` = 50 en esa moneda).
- **Seguridad:** el token vive solo en tu `.env` local, nunca se sube al repo.

## Desarrollo

```bash
npm run dev     # corre el MCP con tsx (sin compilar)
npm run build   # compila a dist/
npm run check   # diagnóstico: valida el token y lista IDs disponibles
```
