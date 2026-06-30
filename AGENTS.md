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
