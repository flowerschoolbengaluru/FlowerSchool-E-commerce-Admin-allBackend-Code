

# Flower School E-Commerce & Admin — AI Coding Agent Guide

## Big Picture Architecture

- **Monorepo**: Three main apps — E-Commerce Frontend, Admin Frontend, Backend API. Shared conventions and some types.
- **Backend (FlowerSchool-E-commerce-Admin-allBackend-Code)**: TypeScript Express.js monolith. All business logic, API endpoints, and integrations in one codebase. Data access via storage abstraction (`storage.ts`, `database-storage.ts`). Background jobs, notifications, message queue, and email logic in `/services`. Database schema and Zod validation in `/shared/schema.ts` (Drizzle ORM, no migration system).
- **Frontend (BouquetBarBengaluru-E-Commerce-Frontend-Code)**: React 18, Vite, TypeScript, shadcn/ui, Radix UI, Tailwind CSS. Routing via Wouter (`setLocation`). Async cart context merges guest/user carts. Product images: check all fields (`imagefirst`...`imagefive`, fallback to `image`). Stock: support both `stockQuantity` and `stockquantity`.

## Critical Developer Workflows

- **Backend**: `npm run dev` (tsx watch), `npm run backend` (alias), `npm run logs` (PM2 logs), `docker-compose up -d` (Postgres + backend), `docker-compose logs -f`. Schema changes: edit `shared/schema.ts` directly, then restart backend.
- **Frontend**: `npm run dev` (from `client/`), edit UI in `src/components/ui/`, pages in `src/pages/`. Use async/await for cart/payment actions. API calls via `src/lib/api.ts`.
- **Admin Frontend**: `npm i`, `npm run dev`, build with `npm run build`. Deploy via Lovable platform. Containerization: see `Dockerfile`, `nginx.conf`.

## Project-Specific Patterns & Conventions

- **Backend**: All data access via storage layer (`storage.ts`). Session management: in-memory sessions in `routes.ts`, manual cleanup. Order status: auto-progress via `services/background-scheduler.ts`. Notifications: use try/catch, templates in `/templates`. Category system: hardcoded master data in `routes.ts`. File uploads: `express-fileupload` and `multer` (50MB limit), local only. API structure: all endpoints in `routes.ts`.
- **Frontend**: Use Wouter for navigation (`setLocation`). UI via shadcn-ui in `src/components/ui`. TanStack Query: no retries, infinite stale time, no refetch on window focus; queries return `null` on 401. Cart context ops are async/await. Product images: check all image fields. Stock: support both `stockQuantity` and `stockquantity`. API proxy: all `/api/` requests in dev go to production.
- **Admin Frontend**: Page logic in `src/pages`, not components. API calls via `src/lib/api.ts`. Use custom hooks for reusable logic. Product discount logic: handled in `Admin.tsx` with auto-calculation and preview. Style exclusively with Tailwind CSS.

## Integration Points

- **Payments**: Razorpay integration in frontend (`client/src/lib/razorpay.ts`) and backend (`routes.ts`).
- **Email**: SendGrid via `services/email-service.ts` (config in `config.ts`).
- **SMS/WhatsApp**: Twilio via `services/notification-service.ts` (templates in `/templates`).
- **SEO**: Managed in `src/components/SEO.tsx` (Admin Frontend).
- **Nginx/Docker**: See `nginx.conf`, `Dockerfile` for deployment config.

## Key Examples & References

- Add a page: Create in `src/pages`, add route in `main.tsx` (frontend/admin).
- Add UI: Use shadcn-ui pattern in `src/components/ui`.
- Fetch data: Use React Query via `src/lib/queryClient.ts` (admin/frontend).
- Product CRUD: See `Admin.tsx` for forms, image upload, category/discount logic.
- Backend endpoints: All in `routes.ts` (~6500+ lines).
- Database: Drizzle ORM tables/Zod schemas in `shared/schema.ts`. Access via `storage.ts` only.

## Debugging & Testing

- **No test framework**: Add Jest/Vitest if needed.
- **Logging**: Request timing middleware in `index.ts` (backend).
- **PM2**: Production process manager (`ecosystem.config.json`).
- **Docker**: Multi-stage build, Postgres service.

---
If any section is unclear, incomplete, or missing, please provide feedback or review referenced files for clarification. These instructions are living documentation—improvements are welcome.

## Project-Specific Gotchas

- **Never use React Router**; only Wouter is supported
- **Delivery charges are always zero**
- **Cart merges guest to user cart on login**
- **API requests in dev go to production backend**; avoid test data pollution

## Anti-Patterns to Avoid

1. **Never bypass storage layer**: Use `storage.*`, not `db.query()`.
2. **Don't hardcode secrets**: Use env vars (see `config.ts`).
3. **Don't split routes.ts**: Only refactor by feature, not piecemeal.
4. **Don't ignore background scheduler**: Orders auto-progress—account for this in status logic.

## Key APIs

- **Auth**: `/api/auth/*` (signup, signin, OTP, password reset)
- **Products**: `/api/products/*` (search, categories, stock)
- **Orders**: Placement, status, cancellation
- **Profile**: User management, address
- **Courses**: Event enrollment

## Example Patterns

**Session Management**
```typescript
const sessions: Map<string, { userId: string; expires: number }> = new Map();
```

**Storage Usage**
```typescript
const user = await storage.getUser(id);
const orders = await storage.getUserOrders(userId);
```

**Category System**
```typescript
const allCategories = [
  { id: "occasion", groups: [{ title: "Celebration Flowers", items: [...] }] }
];
```

---
If any section is unclear or missing, please provide feedback to iterate and improve these instructions.