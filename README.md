# IDS-GRank 🏋️

Aplicación móvil de ranking de gimnasio. Registra tus marcas personales (PRs) en diferentes ejercicios, gana rangos según el peso levantado (Plástico → Challenger), compite con amigos en grupos privados y sigue tu progreso.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Autenticación | NextAuth v5 (Credentials provider, JWT) |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker + Docker Compose |
| Fuentes | Inter (body), Bebas Neue (headings) |

## Requisitos

- Docker Desktop (Windows) o Docker Engine + Compose (Linux/Mac)
- Git

## Cómo levantar

```powershell
# 1. Clonar el repo
git clone <repo-url>
cd IDS-GRank

# 2. Iniciar Docker Desktop (si estás en Windows)

# 3. Construir y levantar todo
docker compose up -d

# 4. Ejecutar migraciones (solo la primera vez)
docker compose exec -T app npx drizzle-kit push

# 5. Sembrar datos de prueba
docker compose exec -T app npx tsx src/db/seed.ts
```

La app queda disponible en **http://localhost:3000**.

## Servicios

| Servicio | URL | Credenciales |
|---|---|---|
| App | http://localhost:3000 | demo@grank.com / demo1234 |
| pgAdmin | http://localhost:5050 | admin@grank.com / admin123 |

## Apagar

```powershell
# Apagar todo (la DB conserva los datos)
docker compose down

# Apagar y borrar datos
docker compose down -v
```

## Funcionalidades

- **Registro e inicio de sesión** con email y contraseña
- **Perfil de usuario** editable (nombre, sexo, peso, altura, nivel, biografía)
- **Ejercicios** organizados por categorías (Pecho, Espalda, Piernas, Hombros, Brazos, Core)
- **Registro de marcas (PR)** con peso, repeticiones, fecha, notas y video
- **Sistema de rangos** por categoría:
  | Rango | Descripción |
  |---|---|
  | Plástico | Peso inicial |
  | Bronce | Superaste el mínimo |
  | Oro | Levantamiento intermedio |
  | Platino | Avanzado |
  | Esmeralda | Élite |
  | Diamante | Máximo |
  | Challenger | Leyenda |
- **Rankings globales** por categoría con badges de rango
- **Planes de entrenamiento** personalizados con ejercicios, series y repeticiones
- **Amigos** búsqueda y agregado por username
- **Grupos de competencia** privados con código de invitación y leaderboard interno

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/           # Login, Register
│   ├── (dashboard)/      # Home, Exercises, Rankings, Plans, Friends, Groups, Profile
│   └── api/              # API routes (auth, exercises, prs, plans, friends, groups, profile, upload)
├── components/           # Navbar, PRCard, CopyButton
├── db/
│   ├── schema/           # Drizzle ORM schemas (7 tablas)
│   ├── index.ts          # Conexión a DB
│   └── seed.ts           # Datos de prueba
├── lib/
│   ├── auth.ts           # Configuración NextAuth
│   ├── tiers.ts          # Lógica de rangos
│   └── utils.ts          # Utilidades
├── proxy.ts              # Protección de rutas (Next.js 16 proxy convention)
└── types/                # Type declarations
```
