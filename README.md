# borealis-readme-gen

A Dataverse external tool for generating README.md files for [Borealis](https://borealisdata.ca) datasets.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default the app runs with **mock data** (`USE_MOCK=true` in `.env.local`).  
To hit the real Borealis API, set `USE_MOCK=false` and ensure your deployment domain is CORS-whitelisted by Borealis.

## Project structure

```
app/
  page.tsx                  # Main page — all app state lives here
  layout.tsx                # Root layout
  api/
    dataset/route.ts        # Proxy → GET Borealis dataset metadata
    files/route.ts          # Proxy → GET Borealis file listing
    variables/route.ts      # Proxy → GET Borealis variable metadata
    save/route.ts           # Proxy → POST README.md to dataset

components/
  Header.tsx                # Wordmark, copy/download/save actions
  Sidebar/
    Sidebar.tsx             # Dataset input, file tree, section toggles, generate button
    Sidebar.module.css
  Viewer/
    Viewer.tsx              # Preview / markdown editor / split view
    Viewer.module.css
  SaveArea.tsx              # Borealis API token input + save button
  SaveArea.module.css

lib/
  types.ts                  # All TypeScript types
  borealis.ts               # Client-side API calls (→ your own API routes)
  template.ts               # README template engine (pure logic)
  mock.ts                   # Mock dataset, files, and variables for dev/demo

styles/
  globals.css               # CSS custom properties / design tokens

public/
  tool.json                 # Dataverse external tool manifest
```

## Deploying to Vercel

```bash
npx vercel
```

Update `toolUrl` in `public/tool.json` to your deployed URL, then ask Borealis admins to register the manifest:

```bash
curl -X POST -H "X-Dataverse-key: ADMIN_TOKEN" \
  https://borealisdata.ca/api/v1/admin/externalTools \
  --upload-file public/tool.json
```

## Environment variables

| Variable   | Default | Description                              |
|------------|---------|------------------------------------------|
| `USE_MOCK` | `true`  | Use mock data instead of Borealis API    |
