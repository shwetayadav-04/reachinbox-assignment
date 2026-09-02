# ReachInbox Email Scheduler

A full-stack email scheduling application built as an internship assignment.

## Stack

| Layer     | Technology                              |
|-----------|----------------------------------------|
| Frontend  | React + TypeScript + Vite + Tailwind   |
| Backend   | Node.js + TypeScript + Express         |
| Database  | PostgreSQL (via Prisma ORM)            |
| Cache/Queue | Redis + BullMQ                      |

## Project Structure

```
reachinbox-assignment/
├── backend/          # Express API
├── frontend/         # React SPA
├── docker-compose.yml
└── README.md
```

## Quick Start

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL on port **5432** and Redis on port **6379**.

### 2. Backend

```bash
cd backend
cp .env.example .env   # then fill in values
npm install
npm run db:migrate
npm run dev
```

API is available at `http://localhost:3001`  
Health check: `GET http://localhost:3001/health`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App is available at `http://localhost:5173`

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all required variables.

## NPM Scripts — Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
