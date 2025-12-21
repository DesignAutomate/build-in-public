# CLAUDE.md - Build in Public App

## What This Is

A content engine for people who need to share their work publicly but hate creating content. The app captures daily work updates through low-friction check-ins and uses AI to surface valuable content the creator might overlook because they're too close to their own work.

**Core principle:** Daily attempt with snowball rollover. AI tries to create content every day. If material is thin or rejected, it rolls into the next day's pool until there's enough for quality publication.

## Tech Stack

- **Frontend:** Next.js 16 with App Router, TypeScript
- **Styling:** Tailwind CSS with custom "Warm Industrial" design system
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Anthropic Claude API
- **Publishing:** Later API (getlate.dev)
- **Icons:** Lucide React
- **Fonts:** Space Grotesk (display) + Sora (body)

## Key Files

- `phase-1-content-generation-plan.md` - Current build plan with all specs
- `build-in-public-technical-recap-v2.md` - What's built, schema details
- `build-in-public-north-star-v1.md` - Product vision and philosophy

## Current Development Focus

**Phase 1: Content Generation** - Building the AI system that turns check-ins into content.

Package 2 (Enhanced Check-in Form) is next. Schema updates are complete.

## Running the Project

```bash
cd C:\App_Development\BuildInPublic\build-in-public
npm install
npm run dev
# Opens at http://localhost:3000
```

## GitHub

- **Branch:** `claude/setup-nextjs-project-DW5Lu`
- Push to this branch, not main (main has protection)

## Supabase

- **Project ID:** soalrvabjfhujvaxlbcm
- **URL:** https://soalrvabjfhujvaxlbcm.supabase.co
- All tables have RLS enabled - users only see their own data
- Storage bucket `uploads` is private (use signed URLs)

## Code Conventions

### General
- TypeScript throughout, strict mode
- British English in all user-facing text
- Never use em dashes - use commas, full stops, or "to" instead
- No American spellings (colour not color, organised not organized)

### Components
- Functional components with hooks
- File naming: `kebab-case.tsx`
- One component per file for main components
- Co-locate small helper components

### Styling
- Tailwind classes, avoid custom CSS unless necessary
- Use design system CSS variables for colours (see globals.css)
- Dark theme throughout - bg-primary is #0c0c0f

### Database
- UUIDs for all primary keys
- snake_case for column names
- Always include user_id for RLS
- Timestamps: created_at, updated_at where applicable

### API Routes
- Located in `src/app/api/`
- Use Next.js Route Handlers
- Return proper HTTP status codes
- Handle errors gracefully with user-friendly messages

## AI Content Guidelines

When writing prompts or generating content:

### Use
- Action verbs: Built, connected, automated, fixed, reduced
- Specific tool names: Make.com, Airtable, Claude, n8n
- Concrete numbers: "4 hours" not "several hours"
- Problem-first framing
- British English

### Avoid
- Marketing speak: "Transform", "unlock potential", "game-changing"
- Guru positioning: "The secret to...", "What most people don't realise..."
- Superlatives: "Best", "fastest", "revolutionary"
- Passive voice
- Em dashes

## Database Schema Quick Reference

### Key Tables
- `check_ins` - Daily work logs with day_type, breakthroughs, in_my_own_words
- `project_updates` - Per-project updates linked to check-ins (problem-first structure)
- `uploads` - Screenshots/files with what_am_i_looking_at, why_does_this_matter
- `content_ideas` - AI-generated ideas with quality scores, snowball tracking
- `content_drafts` - Platform-specific drafts ready for publishing

### Snowball Fields
- `check_ins.processed` - Has this been fed to AI?
- `content_ideas.status` - pending/approved/rejected/incorporated
- `content_ideas.rolled_over_from` - Previous rejected ideas included
- `content_ideas.material_days` - How many days of material used

## Test User

- **Email:** iain@scaleva.co.uk
- Has settings, 1 project, 2 check-ins with uploads

## Common Tasks

### Add a new API route
```
src/app/api/[route-name]/route.ts
```

### Add a new dashboard page
```
src/app/dashboard/[page-name]/page.tsx
```

### Access Supabase (server-side)
```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

### Access Supabase (client-side)
```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

## Don't Forget

1. Check the build plan before starting new work
2. Update technical recap after significant changes
3. Test locally after pushing (pull and run npm run dev)
4. RLS is on - queries need authenticated user context
5. Signed URLs for storage expire after 1 hour
