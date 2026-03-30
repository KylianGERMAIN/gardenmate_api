# GardenMate API

## Contexte

Migration d'un backend Express + Prisma (`gardenmate_back`) vers NestJS + TypeORM (`gardenmate_api`).

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
pnpm test                # tests unitaires
pnpm run test:e2e        # tests E2E (nécessite PostgreSQL)
```

## Structure

```
src/modules/
  auth/             → register, login, refresh, JWT guard, strategy
  token/            → JWT (TokenService exporté)
  users/            → CRUD utilisateurs, rôles (ADMIN/USER)
  plants/           → catalogue de plantes
  user-plants/      → association utilisateur-plante (jardin)
  watering-events/  → événements d'arrosage (transactionnel)
src/common/
  filters/          → AllExceptionsFilter (erreurs uniformes + requestId)
  middleware/        → RequestIdMiddleware (UUID par requête)
  interceptors/     → RequestIdInterceptor (requestId dans les réponses succès)
  decorators/       → @Public(), @Roles(), @CurrentUser()
  guards/           → RolesGuard
  dto/              → ErrorResponseDTO
src/database/
  migrations/       → migrations TypeORM
test/
  helpers/          → utilitaires E2E (createTestApp, truncateAll, auth helpers)
```

## Règles

- Alias `@/*` = `src/*`
- Controller : HTTP uniquement
- Service : métier uniquement
- DTO output → `plainToInstance` obligatoire
- `password` ne sort jamais en réponse
- Migrations pour tout changement de schéma, jamais `synchronize: true`
- Colonnes en `snake_case` dans PostgreSQL (utiliser `name:` dans `@Column`)
- JSDoc sur toutes les méthodes (publiques et privées)
- Pas de `eslint-disable` — corriger le code plutôt que désactiver la règle
