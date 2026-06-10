# Cloudflare Deployment Guide (Adapting to Cloudflare D1 SQL)

This guide walks you through deploying the fully functional **BCS Study Hub** stack to **Cloudflare** using **Cloudflare Pages / Workers** and their free **Cloudflare D1 (SQL Database)** with 100% cloud sync support.

---

## 🚀 Overview of the Stack
1. **Frontend**: React (Vite) styled with Tailwind CSS, compiled to static assets inside `/dist`.
2. **Serverless Edge (Backend)**: Adaptive Node-compatible routes or Cloudflare Workers routing `/api/sync/push` and `/api/sync/pull` directly to the relational Cloudflare D1 engine.
3. **Database (D1)**: Cloudflare's serverless SQLite DB with a generous free tier (matching your requested 500MB+ SQL storage).

---

## ⚙️ Step 1: Initialize Your Cloudflare D1 Database
First, you'll install the wrangler CLI globally or run it via npx to configure your cloud resources.

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```
2. **Create the D1 SQL Database**:
   ```bash
   npx wrangler d1 create bcs-study-db
   ```
   *Wrangler will print out a binding configuration block. Keep this copy handy! It looks like:*
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "bcs-study-db"
   database_id = "your-database-uuid-goes-here"
   ```

---

## 📄 Step 2: Initialize the Database Schema
Adapt our cloud sync relational schema for D1. Create a `schema.sql` locally inside your exported source folder:

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS study_plans (
  sync_code TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Execute this command to provision your active DB tables on Cloudflare's server edge:
```bash
npx wrangler d1 execute bcs-study-db --remote --file=./schema.sql
```

---

## 🎛️ Step 3: Configure Wrangler (`wrangler.toml`)
Create a file named `wrangler.toml` in your project root of your repository to link the server routes and DB:

```toml
name = "bcs-study-hub"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "bcs-study-db"
database_id = "your-database-uuid-goes-here"
```

---

## ⚡ Step 4: Adapt server.ts Code to Worker Format
Cloudflare Pages or Workers utilize the standard `fetch` syntax. If you deploy using **Cloudflare Pages Functions**, place a custom route under `/functions/api/sync/push.ts` and `/functions/api/sync/pull.ts` to query your D1 binding:

### Push Function (`/functions/api/sync/push.ts`):
```typescript
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const payload = await request.json();
    const { syncCode, data } = payload;
    
    if (!syncCode || !data) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Insert or update SQL query on Cloudflare D1
    await env.DB.prepare(
      "INSERT INTO study_plans (sync_code, data_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(sync_code) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP"
    ).bind(syncCode, JSON.stringify(data)).run();

    return new Response(JSON.stringify({ success: true, syncCode }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
```

### Pull Function (`/functions/api/sync/pull.ts`):
```typescript
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const payload = await request.json();
    const { syncCode } = payload;
    
    if (!syncCode) {
      return new Response(JSON.stringify({ error: "Sync key parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Select row from D1 database
    const result = await env.DB.prepare(
      "SELECT data_json FROM study_plans WHERE sync_code = ?"
    ).bind(syncCode).first();

    if (!result) {
      return new Response(JSON.stringify({ error: "Study plan not found with this security key" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, data: JSON.parse(result.data_json) }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
```

---

## 🚀 Step 5: Build and Deploy on Cloudflare
You can deploy your code directly via GitHub integration or CLI!

### Option A: GitHub Connection (Recommended)
1. Commit and push your code to your GitHub Repository.
2. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set the Build Settings:
   - **Framework Preset**: `Vite` (or `None`)
   - **Build Command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

### Option B: Cloudflare Wrangler CLI
To build and deploy quickly from your terminal:
```bash
npm run build
npx wrangler pages deploy ./dist --project-name=bcs-study-hub
```

---

## 🌟 Security Credentials Verification
When utilizing the Gemini API inside your deployed hub, your custom API Keys configured in the in-app settings Drawer are preserved locally in your browser's local cache. They will communicate securely with the Google Generative AI endpoints directly from the edge.

Enjoy your serverless, low-latency, and high-performance **Cloudflare D1-powered BCS Study Hub**!
