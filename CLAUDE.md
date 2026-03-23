# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Run tests
npm test

# Run a single test file
npx vitest src/lib/__tests__/file-system.test.ts

# Lint
npm run lint

# Build for production
npm run build

# Reset database
npm run db:reset
```

After schema changes, run `npx prisma generate && npx prisma migrate dev`.

Set `ANTHROPIC_API_KEY` in `.env` to use real Claude. Without it, the app uses a `MockLanguageModel` that returns static component code.

## Architecture

UIGen is a Next.js 15 (App Router) application where users chat with Claude to generate React components that are previewed live in-browser.

### Data flow

1. User sends a message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. The API reconstructs a `VirtualFileSystem` from the serialized file state sent in the request body, then streams a response from Claude using Vercel AI SDK's `streamText`
3. Claude uses two tools to mutate the virtual FS: `str_replace_editor` (create/str_replace/insert) and `file_manager` (rename/delete)
4. Tool calls are streamed back to the client; `ChatContext` intercepts them via `onToolCall` and forwards to `FileSystemContext.handleToolCall`, which updates the in-memory VFS
5. `PreviewFrame` re-renders on every VFS change (`refreshTrigger`): it runs all `.jsx/.tsx` files through Babel standalone, creates blob URLs, builds an import map, and sets `iframe.srcdoc` with the generated HTML

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree of `FileNode` objects (files and directories). It is the central data structure — not the real filesystem. The class serializes to/from plain JSON for persistence in Prisma and for sending to the API. The AI prompt instructs Claude to place all files under `/` and use `@/` import aliases.

### AI provider (`src/lib/provider.ts`)

`getLanguageModel()` returns either the real `anthropic("claude-haiku-4-5")` model (when `ANTHROPIC_API_KEY` is set) or `MockLanguageModel`, a custom implementation of the `LanguageModelV1` interface that generates static Counter/Card/Form components in 4 streaming steps.

### React contexts

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — wraps `VirtualFileSystem`, exposes CRUD helpers, and `handleToolCall` which translates AI tool calls into VFS mutations. `refreshTrigger` (an incrementing counter) drives re-renders.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, serializes the current VFS state into every request body, and dispatches tool calls to `FileSystemContext`.

### Preview pipeline (`src/lib/transform/`)

`createImportMap` transforms every JS/JSX/TS/TSX file in the VFS with Babel standalone, creates blob URLs, and builds an ES module import map. Third-party packages are resolved to `https://esm.sh/<package>`. Missing local imports get placeholder modules. `createPreviewHTML` wraps everything in an HTML document with Tailwind CDN and an error boundary; the iframe renders it via `srcdoc`.

### Authentication (`src/lib/auth.ts`, `src/middleware.ts`)

JWT-based auth using `jose`, stored in an httpOnly cookie (`auth-token`, 7-day expiry). `getSession()` is server-only. The middleware only protects `/api/projects` and `/api/filesystem`. Anonymous users can use the app freely; work is tracked in `src/lib/anon-work-tracker.ts`.

### Persistence

Projects are stored in SQLite via Prisma. `messages` and `data` (serialized VFS) are stored as JSON strings in text columns. Authenticated users get their project auto-saved after each AI response in the `onFinish` callback of `streamText`.

### Testing

Tests use Vitest with jsdom and `@testing-library/react`. Test files live alongside source in `__tests__` subdirectories.
