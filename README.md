
Readme · MD
# Borealis README Generator
 
## Overview
 
The Borealis README Generator is a web app registered as a Dataverse external tool that consolidates features and metadata from various README generator tools across different institutions into a single, integrated solution. It reads dataset metadata and file information via the Dataverse API and uses that data to populate a structured, customizable README template.
  
---
 
## Features
 
- **Version control** 
- **File selection** — choose which files to include in the file list (C1) and variable metadata list (C2)
- **Variable metadata** — automatically pulls variable-level metadata for tabular files
- **Generation modes** — Minimum (core fields) or Advanced (pick your sections)
- **Custom sections** — add your own freeform sections to the README
- **Dual markdown editing** — preview, raw edit, or split view
- **Save to dataset** — upload the README directly as a file in the dataset
- **Download / copy** — export as `.md` or `.txt`
- **Dark / light mode**
- **Restricted file support** 
---
 
## Workflow
 
1. Navigate to a dataset on Borealis
2. Click **Edit Dataset** → **Create README**
3. Select a version and customize which files and metadata sections to include
4. Generate the README
5. Save it directly to the dataset, or download/copy it separately
---
 
## Stack
 
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS Modules + CSS variables |
| Deployment | Vercel |
| Data source | Dataverse REST API |
 
---
 
## Local Development
 
### Prerequisites
 
- Node.js 18+
- A running Dataverse instance (or use [Docker](https://github.com/IQSS/dataverse-docker))
### Setup
 
```bash
git clone https://github.com/scholarsportal/README-generator-prototype.git
cd README-generator-prototype/borealis-readme-gen
npm install
npm run dev
```
 
The app will be available at `http://localhost:3000`.
 
### Environment
 
Create a `.env.local` file if needed:
 
```env
# Optional: enable mock data for development without a Dataverse instance
USE_MOCK=true
```
 
### Registering as a Dataverse External Tool
 
```bash
curl -X POST "http://localhost:8080/api/v1/admin/externalTools" \
  -H "X-Dataverse-key: YOUR_API_TOKEN" \
  --upload-file public/tool.json
```
 
---
 
## Tool Registration
 
The tool is registered as a `configure`-type dataset-level external tool. The `tool.json` file in `public/` defines the tool parameters passed by Dataverse (dataset PID, site URL, locale).
 
---
 
