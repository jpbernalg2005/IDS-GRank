<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cómo levantar la app (Docker)

Requisitos: Docker Desktop (o Docker Engine + Compose) corriendo. **No hace falta crear ningún `.env`** — las variables ya vienen definidas en el bloque `environment` del servicio `app` de `docker-compose.yml`, así que `docker compose up` se las inyecta solo.

```bash
# 1. Construir y levantar Postgres + la app
docker compose up -d --build

# 2. Sembrar datos de prueba (solo la primera vez)
docker compose exec -T app npm run db:seed
```

- Las migraciones se aplican solas: el contenedor `app` ejecuta `npx drizzle-kit push` antes de arrancar (ver `CMD` del `Dockerfile`).
- App disponible en **http://localhost:3000**
- Usuario demo: **demo@grank.com / demo1234**

En Windows existe el atajo `./start.ps1` (build + up + migraciones + seed). Usar `./start.ps1 -SkipSeed` para omitir el seed.

Apagar: `docker compose down` (conserva datos) o `docker compose down -v` (borra la BD).

## Variables de entorno

Definidas en `docker-compose.yml`; no se necesita ningún archivo a mano para levantar con Docker.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Postgres (`src/db/index.ts`, `drizzle.config.ts`) |
| `AUTH_SECRET` | Firma de JWT de NextAuth v5 |
| `NEXTAUTH_URL` | URL base de la app para callbacks de auth |

Las subidas de video se guardan de forma híbrida: si la variable de entorno `UPLOADTHING_TOKEN` está configurada (modo producción), se suben a **UploadThing** usando `UTApi` de `uploadthing/server`. Si no está configurada (desarrollo local), se guardan en el filesystem local (`public/uploads/`).

# Testing

Runner: **Vitest**. Los tests de integración levantan un Postgres efímero con **Testcontainers**, así que **Docker debe estar corriendo** (no usan la BD de desarrollo). Requiere deps instaladas: `npm install`.

```bash
npm test           # corre todos los tests una vez
npm run test:watch # modo watch (re-corre al guardar)
```

- Tests unitarios: lógica aislada (ej. `getTier`), sin BD.
- Tests de integración: aplican el schema desde `src/db/migrations/` a un contenedor nuevo, siembran datos y lo destruyen al terminar.
- Si cambias un schema en `src/db/schema/`, regenera las migraciones antes de testear: `npm run db:generate`.

# Recompensas tipo BADGE (milestones)

Las 4 recompensas `BADGE` en `src/db/seed.ts` (costCoins 0) representan logros, no compras. `rewards.milestoneKey` (nullable) marca cuál: `FIRST_PR` | `WEIGHT_100KG` | `DIAMOND_TIER` | `CONSECUTIVE_WINS_10`. `POST /api/rewards` valida elegibilidad server-side antes de canjear (`isEligibleForMilestone` en `src/app/api/rewards/route.ts`); ver esa función para el detalle de cada chequeo.

- La columna `personal_records.isVerified` es dead code (nunca sale de `PENDING`) — no la uses para gating, dejaría los logros inalcanzables.
- `CONSECUTIVE_WINS_10` está deliberadamente sin implementar: la semántica de victorias/rachas de retos es una decisión de producto pendiente. El endpoint rechaza el canje de esa insignia con "Este logro aún no está disponible" hasta que se resuelva.
- Los literales de `milestoneKey` (p. ej. `CONSECUTIVE_WINS_10`) disparan falsos positivos en la regla `generic-api-key` de Gitleaks (MegaLinter `REPOSITORY_GITLEAKS`), porque el nombre del campo contiene "key". Están permitidos vía allowlist en `.gitleaks.toml` (raíz del repo) — si agregas un nuevo valor al enum `milestoneKey`, añádelo también a esa allowlist.

# Recompensas equipables (AVATAR_FRAME / TITLE)

- `users.equippedFrameRewardId` / `users.equippedTitleRewardId` (nullable FKs a `rewards.id`) guardan como máximo un `AVATAR_FRAME` y un `TITLE` equipados a la vez. Equipar uno nuevo del mismo tipo reemplaza automáticamente al anterior (no hay tabla de "equipados múltiples"). `BADGE` no es equipable — sólo se muestra en la vitrina de insignias del perfil (owned vs. locked).
- Endpoint: `POST /api/rewards/equip` con `{ rewardId, action: "equip" | "unequip" }`. Valida ownership vía `userRewards` y que `reward.type` sea equipable.
- Las relaciones drizzle `equippedFrame`/`equippedTitle` (de `users` hacia `rewards`) viven en `src/db/schema/relations.ts`, no en `users.ts` ni `rewards.ts`. Esos dos archivos ya se importan mutuamente para las FK columns; meter las relations ahí habría añadido un segundo ciclo. `relations.ts` importa ambos y no es importado por ninguno, así que no hay ciclo.
- Para mostrar el frame/título de **otros** usuarios (Rankings, Friends) sin un round-trip extra por fila, las queries en `api/personal-records` y `api/friends` hacen `leftJoin` con `rewards` aliasado (`drizzle-orm/pg-core` `alias()`) dos veces (frame y title), o usan `with: { equippedFrame: true, equippedTitle: true }` en queries relacionales (`db.query.friendships.findMany`).
- UI compartida: `src/components/equipped-cosmetics.tsx` (`AvatarWithFrame`, `TitleChip`) — sin hooks, usable desde server y client components. El ring de color por marco está keyed por `assetValue` (emoji) en `FRAME_RING_STYLES`, con fallback genérico para marcos futuros no mapeados.
- El círculo interior de `AvatarWithFrame` debe usar un fondo **opaco** (`bg-card`) cuando hay `frameAsset`, no `bg-primary/10` — con fondo translúcido, el `bg-gradient-to-br` del wrapper exterior se filtra a través de todo el círculo en vez de quedar confinado al anillo de `p-[2px]`. Sin frame, `bg-primary/10` sigue siendo válido. El glow neón por marco vive en `FRAME_GLOW_STYLES`, keyed igual que `FRAME_RING_STYLES` (mismo fallback genérico `DEFAULT_FRAME_GLOW`) — si agregas un marco nuevo, agrégalo a ambos mapas.
- Alcance decidido: el patrón se aplicó a Profile, Rankings y Friends (confirmados). No se extendió a `challenges-inbox.tsx` ni a `groups/[id]/page.tsx` — sus vistas de "participantes"/"miembros" no tienen el mismo shape de avatar+username confirmado por el captain (groups usa badge de rank numérico, no avatar por usuario); si se pide extender ahí, replicar el mismo patrón de joins + `AvatarWithFrame`/`TitleChip`.

# Centro de notificaciones in-app

- La tabla `notifications` (`src/db/schema/notifications.ts`, migración `0002_blushing_starbolt`) fue introducida por la tienda de recompensas (#8) y por el centro de notificaciones (#9) de forma independiente, con esquema idéntico byte-a-byte — ambas ramas se cortaron antes de que la otra mergeara. Al rebasear #9 sobre `develop`, su migración/snapshot propios (`0002_skinny_tigra`) se descartaron por completo (no renumerar/reaplicar) porque `develop` ya crea la misma tabla; `npx drizzle-kit generate` tras el rebase confirma "No schema changes, nothing to migrate".
- Si vuelve a aparecer un conflicto de numeración de migraciones (`meta/_journal.json`, `meta/000N_snapshot.json`), primero compara el `CREATE TABLE`/columnas de ambos lados: si son iguales, la resolución correcta suele ser eliminar la migración duplicada de la rama que se rebasea, no renumerarla, ya que se lo que crea no es contenido nuevo.
- Helper de creación: `createNotification(txOrDb, input)` en `src/lib/notifications.ts`, pensado para usarse dentro de `db.transaction()` junto con la escritura de negocio que dispara la notificación (ver `POST`/`PUT` de `src/app/api/friends/route.ts` para el patrón).
