# DRISHTI — Disaster Intelligence & Rescue System

**By Team ANVESHA · Project Abhedya · Track 5: Disaster Management & Rescue**

DRISHTI is a presentation-ready, frontend-only disaster-management demo. It opens with a preloaded simulated monsoon flood scenario centered around Sullia and Belthangady in Dakshina Kannada, Karnataka. It demonstrates how responders could spot isolated villages, flag high-risk locations with no incoming reports, and prioritize response under changing road conditions.

> **Important:** The scenario, incident counts, confidence values, facilities, team positions and status indicators are synthetic demo data. This prototype is not an official emergency feed, a validated prediction model, or a dispatch system. Do not use it for real-world response decisions.

## What’s in the demo

- Leaflet map with OpenStreetMap-based tiles, village and facility markers, modeled flood zones, road states, and map-layer visibility controls.
- Isolation predictor: block or reopen a road using the map or corridor controls; the graph recalculates reachable/isolated villages and the rescue-priority order.
- Silent-area detection for high-risk villages with zero emergency reports, including the alert **“HIGH RISK – NO REPORTS – NEEDS VERIFICATION”.**
- Ranked rescue-priority queue with score, risk, confidence, access state and a reason for attention.
- Animated store-and-forward mesh-relay demonstration, response/incident summary cards, a report-activity chart and CSV situation-brief export.
- No backend, login, API key or initial setup screen is required. The sample data is loaded by default. An internet connection is needed for external map tiles and the optional Google Fonts stylesheet; the dashboard data and demo interactions are local.

## Technology

React 19, TypeScript, Vite 6, Leaflet, React-Leaflet and Lucide icons. The interface uses the OpenStreetMap community map data attribution and OpenStreetMap DE as its tested tile service.

## Requirements

- Node.js 20 or newer
- pnpm 11 (the exact package-manager version is pinned in `package.json`)
- Internet access for map tiles and Google Fonts

## Run locally

From the extracted project folder:

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:3000`). To create and serve the production build locally:

```bash
pnpm build
pnpm preview
```

No environment file or configuration values are needed.

## Demo controls

- Use **LAYERS** above the map to show or hide village markers, response facilities, roads, or risk/flood zones.
- Click a road on the map or use **BLOCK / REOPEN** in the Isolation Predictor. Orange flooded roads are modeled as passable with caution until explicitly blocked.
- Use **SEND PING** in Offline Mesh Relay to animate a message through the village, responder relay, shelter and command-post hops.
- Choose **Export situation brief** to download the current ranked queue as a CSV.

## Sample data

`data/scenario-karnataka.json` is the editable, standalone sample scenario. It contains the scenario metadata, seven village records, six road segments, two hospitals, two shelters, two simulated response-team locations and a flood-zone polygon. `src/data.ts` provides the typed exports used by the React components. Edit the JSON and restart the development server to try another sample configuration; the graph expects road endpoints to match village `id` values.

## Project structure

```text
.
├── data/
│   └── scenario-karnataka.json   # Preloaded simulated Karnataka incident data
├── public/
│   ├── drishti-mark.svg          # Local favicon / compass mark
│   └── manus-routes.json         # Manus route declaration
├── src/
│   ├── App.tsx                   # Dashboard, predictor, alerts, priorities and relay
│   ├── MapPanel.tsx              # Leaflet map, overlays, markers and road interactions
│   ├── data.ts                   # Typed exports from the sample JSON
│   ├── main.tsx                  # React entry and global stylesheets
│   └── styles.css                # Dashboard visual system and responsive rules
├── .gitignore
├── app.config.ts                 # Manus project branding metadata (not needed for standalone Vite)
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## Upload this source to GitHub

The provided source ZIP excludes `.git`, `node_modules` and generated `dist` output. Create an empty GitHub repository named **`DRISHTI-Disaster-Management`** first. Private visibility is a safe default; choose public only if you want the source visible to everyone. Do not initialize the new repository with a README, license or `.gitignore`, because those files are already included here.

After extracting the ZIP, open a terminal in the extracted project folder and run:

```bash
git init -b main
git add .
git commit -m "Initial DRISHTI demo project"
git remote add origin https://github.com/<YOUR-USERNAME>/DRISHTI-Disaster-Management.git
git push -u origin main
```

Replace `<YOUR-USERNAME>` with your GitHub username. Authenticate using GitHub CLI (`gh auth login`) or your system’s Git credential manager; do not paste a personal access token into source files or commit it.

If GitHub CLI is already authenticated and the repository does not yet exist, you can instead create it and push in one step:

```bash
gh repo create DRISHTI-Disaster-Management --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` only if you explicitly want a public repository.
