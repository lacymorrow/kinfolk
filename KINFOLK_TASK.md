# Kinfolk Phase 1 Build Task

## What to Build
A family directory app built on the existing Shipkit boilerplate. Phase 1: family tree visualization + searchable directory + person detail pages.

## Stack (already in Shipkit)
- Next.js (App Router), Drizzle ORM, Tailwind, shadcn/ui, Bun
- Add: `@xyflow/react` (ReactFlow v12) for family tree visualization

## Database Schema
Add these tables to the existing Drizzle schema (in `src/server/db/`). Keep existing Shipkit tables, add alongside them.

### New Tables

```typescript
// families table
families: {
  id: uuid PK (default random)
  name: text not null  // "The Morrows"
  createdBy: uuid FK → users (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}

// people table - the core entity
people: {
  id: uuid PK
  familyId: uuid FK → families
  userId: uuid FK → existing auth users table (nullable - not everyone has account)
  firstName: text not null
  middleName: text (nullable)
  lastName: text not null
  maidenName: text (nullable)
  nickname: text (nullable)
  birthdate: date (nullable)
  deathdate: date (nullable)
  gender: text (nullable)
  bio: text (nullable)
  avatarUrl: text (nullable)
  isAlive: boolean default true
  createdAt: timestamp
  updatedAt: timestamp
}

// contacts table - flexible contact info
contacts: {
  id: uuid PK
  personId: uuid FK → people
  type: text not null  // 'email', 'phone', 'address', 'social'
  subtype: text  // 'home', 'work', 'mobile', 'instagram'
  value: text not null
  isPrimary: boolean default false
  createdAt: timestamp
}

// addresses table
addresses: {
  id: uuid PK
  personId: uuid FK → people
  label: text  // 'home', 'work'
  street1: text not null
  street2: text (nullable)
  city: text not null
  state: text not null
  zip: text not null
  country: text default 'US'
  isPrimary: boolean default true
  createdAt: timestamp
}

// relationships table - bidirectional
relationships: {
  id: uuid PK
  personId: uuid FK → people
  relatedId: uuid FK → people
  type: text not null  // 'parent', 'child', 'spouse', 'sibling', 'partner'
  startedAt: date (nullable)
  endedAt: date (nullable)
  createdAt: timestamp
}
```

## Routes to Create

Under `src/app/(app)/kinfolk/` (or just `src/app/(app)/` if cleaner):

```
/tree          → Interactive family tree (ReactFlow)
/directory     → Searchable card grid of all people
/person/[id]   → Person detail page
/person/[id]/edit → Edit person form
/admin/family  → Family management (add people, manage relationships)
```

## UI Components to Build

### Family Tree (`/tree`)
- Use `@xyflow/react` (ReactFlow)
- Custom person node: avatar circle + name + birth year
- Edges: solid for parent-child, dashed for spouse/partner
- Click node → navigate to person detail
- Zoom, pan, minimap, fit-to-screen
- Mobile responsive (simplified view OK)

### Directory (`/directory`)
- Card grid layout (responsive)
- Each card: avatar, name, location, relationship tag
- Search bar (name search)
- Filter by generation or last name
- Sort by name, age

### Person Detail (`/person/[id]`)
- Header: avatar, full name, age, location
- Contact info section (email, phone with click-to-action)
- Address with map link
- Relationships sidebar: parents, siblings, spouse/partner, children (all clickable)
- Edit button for admins

### Person Form (`/person/[id]/edit` and `/admin/family`)
- Form with all person fields
- Relationship picker (select existing people)
- Address fields
- Contact fields (dynamic add/remove)

## Seed Data

Create a seed script that populates the Morrow family. Here's the family tree:

### Generation 1 (Parents)
- **Tom Morrow** & **Susan Morrow** (née Cowhig)

### Generation 2 (Tom's brother's family)
- **John Morrow** & **Suzanne Morrow** (spouse)

### Generation 3 (Lacy + cousins)

**Tom & Susan's child:**
- **Lacy Morrow** & Cait — 1011 Sewickley Dr, Charlotte, NC 28209 — me@lacymorrow.com

**John & Suzanne's daughters:**
- **Sarah Alice Morrow** — 75 Walter Ridge Rd, West Jefferson, NC 28694 — sarahamorro3@gmail.com
- **Kelsey Fontenot** (née Morrow) & Andrew Fontenot — 6809 Miranda Dr, Austin, TX 78752
- **Mattie** (married, last name TBD)
- **Holly** (married, last name TBD)

**Other cousins (parents not yet known):**
- **Taylor** & Tracy (partner) — 1604 Harmont Dr, Raleigh, NC 27603 — kids: Twyla, Beatrice
- **Kristie Parker** (née Morrow?) & Daniel Parker — 104 Alabama Ave, Carolina Beach, NC 28428 — Kristiebyrd@gmail.com
- **Liza Stevens** & Ross Stevens — 20 W Henderson St, Wrightsville Beach, NC 28480 — Lizastevens09@gmail.com — kids: Saylor, Lily
- **Ginny Lamb** (cousin) & Marc Lamb — 6636 Mangrove Way, Naples, FL 34109 — Ginnylamb1@gmail.com — kid: Xavier
- **Lucas Morrow** & Alison — 314 Baymount Dr, Statesville, NC 28625 — Lotsaluc2@gmail.com
- **Lacy Lawrence** (née Morrow?) & Josh Lawrence — 3209 Camden Cir, Wilmington, NC 28403 — Lalawrence37@gmail.com / jflawrence87@gmail.com — kid: Avery

### Generation 4 (Babies)
- Twyla (Taylor & Tracy's)
- Beatrice (Taylor & Tracy's)
- Saylor Stevens (Liza & Ross's)
- Lily Stevens (Liza & Ross's)
- Xavier Lamb (Ginny & Marc's)
- Avery Lawrence (Lacy L. & Josh's)

## Implementation Notes
- Use the existing Shipkit auth system (NextAuth) - don't rebuild auth
- Use the existing Drizzle setup - just add new schema tables
- Use existing shadcn/ui components from Shipkit
- Server actions for all mutations
- Server components for data fetching
- Keep it simple - this is Phase 1

## Don't Touch
- Existing Shipkit auth/payment/CMS setup
- Existing routes that aren't kinfolk-related
- The CLI folder

When completely finished, run this command to notify me:
openclaw system event --text "Done: Kinfolk Phase 1 built - family tree, directory, person pages, seed data" --mode now
