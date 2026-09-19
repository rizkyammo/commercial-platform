# AmmoBiz — Commercial Intelligence & Control Platform

Commercial platform untuk mengelola transaksi, compliance, margin, dan spatial BI.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + PostGIS + Auth + Storage + RLS)
- **Maps:** Leaflet + OpenStreetMap
- **Charts:** Recharts
- **Excel:** ExcelJS
- **Testing:** Vitest, Playwright
- **Hosting:** Vercel + Supabase Cloud

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment (copy dari .env.example)
cp .env.example .env.local

# Run migrations (via Supabase Dashboard → SQL Editor)
# Jalankan file-file di supabase/migrations/ secara berurutan

# Dev server
npm run dev