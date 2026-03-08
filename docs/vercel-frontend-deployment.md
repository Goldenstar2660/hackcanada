---
title: Deploy The Binsight Frontend To Vercel
description: Beginner-friendly step-by-step instructions for deploying the Binsight dashboard frontend from this monorepo to Vercel
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: how-to
keywords:
  - vercel
  - vite
  - deployment
  - firebase
  - dashboard
estimated_reading_time: 12
---

## Before You Start

This guide deploys only the dashboard frontend. It does not move the backend away from Firebase Cloud Functions or Firestore.

You need these accounts and tools first:

* A GitHub account with this repository pushed to GitHub
* A Vercel account
* A Firebase project that already has Auth, Firestore, Functions, and demo data set up
* Node.js 20 installed on your computer
* Corepack enabled so `pnpm` works

If your Firebase project is not ready yet, use `docs/firebase-rehearsal-runbook.md` first for the Firebase setup, deploy, and seed sequence.

> [!IMPORTANT]
> The dashboard reads Firebase directly in the browser and will fail during startup if the required `VITE_FIREBASE_*` values are missing or incorrect.

## Step 1: Verify The Frontend Builds Locally

Open PowerShell in the repository root and run these commands:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm run web:build
```

If `pnpm run web:build` fails because Corepack cannot verify pnpm keys on your machine, use this repo-owned fallback command instead:

```powershell
node scripts/pnpm-cli.mjs --filter @binsight/web run build
```

What success looks like:

* The command finishes without errors
* The folder `apps/web/dist` is created or updated

If this step fails, stop here and fix the local build before using Vercel.

## Step 2: Collect Your Firebase Web App Values

You will need these values from your Firebase project:

* `VITE_FIREBASE_API_KEY`
* `VITE_FIREBASE_APP_ID`
* `VITE_FIREBASE_AUTH_DOMAIN`
* `VITE_FIREBASE_PROJECT_ID`
* `VITE_FIREBASE_FUNCTIONS_REGION`
* `VITE_FIREBASE_MESSAGING_SENDER_ID`
* `VITE_FIREBASE_STORAGE_BUCKET`
* `VITE_FIREBASE_MEASUREMENT_ID`

The expected variable names are listed in `apps/web/.env.example`.

To find the values in Firebase:

1. Open <https://console.firebase.google.com/>.
2. Click your Firebase project.
3. Click the gear icon next to Project Overview.
4. Click Project settings.
5. Scroll to the Your apps section.
6. Click your Web app.
7. Copy the Firebase config values into a temporary note.

If you do not have a Web app yet:

1. In Project settings, scroll to Your apps.
2. Click the Web icon `</>`.
3. Enter an app nickname.
4. Click Register app.
5. Copy the Firebase config values.

## Step 3: Push Your Latest Changes To GitHub

Vercel deploys from your Git repository.

From the repository root, run:

```powershell
git status
git add vercel.json package.json docs/vercel-frontend-deployment.md apps/web/README.md .copilot-tracking
git commit -m "docs(docs): add vercel frontend deployment guide"
git push
```

If you do not want to commit the `.copilot-tracking` files, remove that path from the `git add` command.

## Step 4: Import The Repository In Vercel

1. Open <https://vercel.com/dashboard>.
2. If you are prompted to log in, sign in.
3. In the top-left team switcher, make sure the correct personal account or team is selected.
4. Click `Add New...`.
5. Click `Project`.
6. If GitHub is not connected yet, click `Continue with GitHub` and authorize Vercel.
7. Find your repository in the list.
8. Click `Import` next to the repository.

## Step 5: Enter The Exact Vercel Build Settings

On the import page, set these values exactly:

* Framework Preset: `Other`
* Root Directory: `.`
* Build Command: `pnpm run web:build`
* Output Directory: `apps/web/dist`
* Install Command: `pnpm install --frozen-lockfile`

How to set the Root Directory:

1. Find the `Root Directory` section.
2. Click `Edit`.
3. Select the repository root, or type `.` if Vercel allows manual entry.
4. Save the Root Directory setting.

How to set the other commands:

1. Open the `Build and Output Settings` section.
2. Toggle it on if Vercel shows an override switch.
3. Replace the default values with the exact commands above.

## Step 6: Add Environment Variables In Vercel

Still on the import page:

1. Open the `Environment Variables` section.
2. Add each Firebase variable one at a time.
3. For each variable, paste the correct value.
4. Select `Production`, `Preview`, and `Development` unless you deliberately use separate Firebase projects.
5. Click `Add` after each variable.

Add these names exactly:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_APP_ID
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_FUNCTIONS_REGION
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MEASUREMENT_ID
```

> [!WARNING]
> If even one required value is blank or misspelled, the dashboard can deploy successfully but fail as soon as it loads in the browser.

## Step 7: Deploy The Project

1. Click the `Deploy` button.
2. Wait for the install step to finish.
3. Wait for the build step to finish.
4. When the deployment completes, click the generated URL.

What success looks like:

* The site loads instead of showing a Vercel error page.
* You see the Binsight operator sign-in screen.
* After signing in, routes like `/stations` and `/analytics` load.

## Step 8: Test A Deep Link

The repo includes a `vercel.json` rewrite so route refreshes should work.

Test it like this:

1. Open the deployed site.
2. Sign in.
3. Navigate to a nested page such as `/analytics` or `/history`.
4. Press refresh in the browser.

If the page reloads correctly instead of showing `404`, the rewrite is working.

## Step 9: Update Environment Variables Later If Needed

If you need to change a Firebase value after deployment:

1. Open <https://vercel.com/dashboard>.
2. Click your project.
3. Click `Settings`.
4. Click `Environment Variables`.
5. Find the variable you want to change.
6. Click `Edit`.
7. Save the new value.
8. Click `Deployments`.
9. Redeploy the latest deployment.

## Troubleshooting

### The build fails in Vercel

Check these first:

* You pushed the latest repository changes to GitHub
* `pnpm run web:build` works locally
* The Vercel Build Command is exactly `pnpm run web:build`
* The Vercel Output Directory is exactly `apps/web/dist`

If your local machine fails before Vercel because of a Corepack key error, validate the frontend with `node scripts/pnpm-cli.mjs --filter @binsight/web run build` and then continue.

### The site loads, but it crashes immediately

Check these first:

* All `VITE_FIREBASE_*` values were added in Vercel
* `VITE_FIREBASE_FUNCTIONS_REGION` matches the region where Firebase Functions were deployed
* `VITE_FIREBASE_PROJECT_ID` matches the same project used by Firestore and Auth

### Sign-in works, but dashboard pages are empty

Check these first:

* Firestore exists in the selected Firebase project
* Firebase Functions are deployed
* Demo data was seeded
* The operator account has permission to sign in

## Quick Reference

Use these values in Vercel:

```text
Framework Preset: Other
Root Directory: .
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm run web:build
Output Directory: apps/web/dist
Node.js Version: 20.x
```