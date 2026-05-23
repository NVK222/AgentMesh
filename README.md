# AgentMesh

AgentMesh is a highly resilient, distributed multi-agent orchestration engine designed to break down high-level computational and engineering objectives into specialized execution task graphs. 

Built using a decoupled, event-driven architecture, the system safely abstracts complex agent behaviors, state management, and continuous large language model interactions entirely away from the web application interface layer into specialized background nodes.

---

## Infrastructure & Tech Stack

This project is built explicitly as a self-hosted monorepo using manual infrastructure orchestration to demonstrate technical mastery over advanced state sync, event streams, and database configurations—avoiding managed Backend-as-a-Service shortcuts.

- **Monorepo Management:** `pnpm Workspaces` + `Turborepo` for unified build pipelines.
- **Frontend Workspace (`apps/web`):** `Next.js` (App Router / React / Turbopack), `Tailwind CSS`, and real-time visualization canvas pipelines.
- **Worker Node Subsystem (`apps/worker`):** Stateless `Node.js` processing instance running isolated task workers.
- **Shared Module System (`packages/shared`):** Unified database context, validation schemas, and common configurations shared across monorepo nodes.
- **Message Broker & Memory Store:** `Redis` coupled with `BullMQ` for high-throughput background scheduling.
- **Relational Storage:** `PostgreSQL` backed by `Prisma ORM` for transactional state tracking and migrations.

---

## Preview
<img width="1798" height="1012" alt="image" src="https://github.com/user-attachments/assets/53487433-7e49-450c-b264-9b7841fcad23" />
<img width="1815" height="1023" alt="image" src="https://github.com/user-attachments/assets/4ddf6c20-db9b-41f7-a29e-1c8ad11fd870" />
<img width="1813" height="1022" alt="image" src="https://github.com/user-attachments/assets/6c6fe94d-af7b-4071-af4a-56be9117584b" />

---

## Getting Started

### Prerequisites
Make sure you have **Node.js**, **pnpm**, and **Docker** installed locally.

### 1. Environment Configurations
Create an `.env` file at the repository root:
```env
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_DB=""
DATABASE_URL="postgresql://<USER>:<PW>@localhost:5432/<DB>?schema=public"
```
Add the DATABASE_URL to .env in apps/web as well.
```env
GEMINI_API_KEY=
```
You can edit the model inside apps/worker/src/services/process.ts
### 2. Start up docker  
```bash
sudo docker compose up -d
```
### 3. Apply prisma migrations
```bash
pnpm --filter @agentmesh/shared exec prisma migrate reset
pnpm --filter @agentmesh/shared exec prisma migrate dev
```
### 4. Start up the server
```bash
pnpm dev
```
