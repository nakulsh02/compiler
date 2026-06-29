# CodeSync — Collaborative Code Editor

A real-time collaborative code editor with Monaco editor, project management, live chat, version history, and Supabase-backed auth and storage.

## Run & Operate

- `pnpm --filter @workspace/codesync run dev` — run the frontend (auto-started via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- Required secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase project credentials

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v3
- Editor: Monaco Editor + @monaco-editor/react
- Realtime collaboration: Yjs + y-monaco
- Auth + DB: Supabase (@supabase/supabase-js)
- Fonts: Inter (UI) + JetBrains Mono (code)

## Where things live

- `artifacts/codesync/src/` — main app source
- `artifacts/codesync/src/pages/` — AuthPage, DashboardPage, EditorPage
- `artifacts/codesync/src/components/` — CodeEditor, FileExplorer, Sidebar, TopBar, ChatPanel, etc.
- `artifacts/codesync/src/context/AuthContext.tsx` — Supabase auth context
- `artifacts/codesync/src/lib/supabase.ts` — Supabase client + table types

## Architecture decisions

- Supabase is used for both auth and database (profiles, projects, project_files, chat_messages, versions tables)
- Tailwind CSS v3 (postcss plugin) — not v4, because the Bolt source used v3 `@tailwind` directives
- Supabase client uses placeholder values when env vars are missing so the UI renders without crashing

## Product

- Sign up / sign in with email + password
- Create, manage, star, duplicate, and delete coding projects
- Full Monaco code editor with syntax highlighting for 20+ languages
- Sidebar panels: file explorer, search, chat, version history, settings
- Real-time cursor presence via Yjs

## User preferences

_Populate as you build._

## Gotchas

- App needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets set to function (auth + data). Without them it renders but all Supabase calls fail.
- Tailwind is v3 (postcss), NOT v4 — do not add `@tailwindcss/vite` or `@import "tailwindcss"` syntax.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
