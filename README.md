# GardenMate API

Backend API pour GardenMate, une application de gestion de plantes et d'arrosage.

## Stack

- **Framework** : NestJS 11
- **Base de donnees** : PostgreSQL 16
- **ORM** : TypeORM
- **Auth** : JWT (access + refresh tokens)
- **Validation** : class-validator / class-transformer
- **Linting** : oxlint
- **Formatting** : oxfmt
- **Runtime** : Node 22, pnpm

## Lancer le projet

### Avec Docker (recommande)

```bash
docker compose up --build
```

- API : `http://localhost:3001`
- PostgreSQL : `localhost:5433`

### En local (sans Docker)

```bash
# Lancer la DB avec Docker
docker compose up db

# Installer les dependances
pnpm install

# Lancer en dev
pnpm run start:dev
```

## Scripts

| Commande | Description |
|---|---|
| `pnpm run start:dev` | Dev avec hot reload |
| `pnpm run start:debug` | Dev avec debugger |
| `pnpm run build` | Build production |
| `pnpm run start:prod` | Lancer le build |
| `pnpm run test` | Tests unitaires |
| `pnpm run test:e2e` | Tests end-to-end |
| `pnpm run lint` | Linting (oxlint) |
| `pnpm run fmt` | Formatting (oxfmt) |
| `pnpm run migration:generate` | Generer une migration |
| `pnpm run migration:run` | Executer les migrations |
| `pnpm run migration:revert` | Revert la derniere migration |

## Variables d'environnement

Copier `.env.example` vers `.env` et adapter les valeurs.

## Convention de commits

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>
```

### Types

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement fonctionnel |
| `chore` | Maintenance, deps, config |
| `docs` | Documentation |
| `test` | Ajout ou modification de tests |
| `ci` | CI/CD |

### Exemples

```
feat(auth): add JWT refresh token endpoint
fix(plants): correct watering frequency calculation
chore: upgrade NestJS to v11
refactor(users): extract validation logic to pipes
docs: update README with docker setup
```
