# GardenMate API

## Contexte

Migration d'un backend Express + Prisma (`gardenmate_back`) vers NestJS + TypeORM (`gardenmate_api`).  
Branche courante : `feat/auth-register` — `POST /api/v1/auth/register` opérationnel.

## Stack

- NestJS 11 · TypeORM · PostgreSQL · pnpm
- `class-validator` / `class-transformer` · `@nestjs/jwt` · `bcrypt`
- Swagger sur `/api-docs` · oxlint

## Commandes

```bash
pnpm start:dev           # dev
pnpm run build           # compilation
pnpm run migration:run   # appliquer migrations
pnpm run migration:generate  # générer une migration
pnpm run lint            # oxlint
```

## Structure

```
src/modules/
  auth/         → register, login, refresh
  token/        → JWT (TokenService exporté)
  users/        → CRUD utilisateurs
src/database/
  migrations/   → migrations TypeORM
```

## Règles

- Alias `@/*` = `src/*`
- Controller : HTTP uniquement
- Service : métier uniquement
- DTO output → `plainToInstance` obligatoire
- `password` ne sort jamais en réponse
- Migrations pour tout changement de schéma, jamais `synchronize: true`
- JSDoc sur les méthodes publiques de service
