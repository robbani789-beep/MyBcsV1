import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit to accommodate larger study guides if needed
  app.use(express.json({ limit: "15mb" }));

  // API Route: Push to Cloud
  app.post("/api/sync/push", async (req, res) => {
    try {
      const { syncCode, ...payload } = req.body;
      
      if (syncCode) {
        // If a syncCode already exists, update the existing JSONBlob in-place using PUT!
        const response = await fetch(`https://jsonblob.com/api/jsonBlob/${syncCode}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`failed to update jsonblob: ${response.status} ${response.statusText}`);
        }

        return res.json({ id: syncCode });
      } else {
        // Create a brand new JSONBlob on first push
        const response = await fetch("https://jsonblob.com/api/jsonBlob", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`failed to create jsonblob: ${response.status} ${response.statusText}`);
        }

        const locationHeader = response.headers.get("Location") || response.headers.get("location");
        if (!locationHeader) {
          throw new Error("Location header is missing in jsonblob response");
        }

        const parts = locationHeader.split("/");
        const code = parts[parts.length - 1];

        if (!code) {
          throw new Error("Could not parse code from Location header");
        }

        return res.json({ id: code });
      }
    } catch (error: any) {
      console.error("Error pushing to cloud:", error);
      return res.status(500).json({ error: error.message || "Failed to save to cloud storage" });
    }
  });

  // API Route: Pull from Cloud
  app.get("/api/sync/pull/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: "Code not found" });
        }
        throw new Error(`Failed to fetch from jsonblob: ${response.status}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Error pulling from cloud:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve from cloud storage" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
