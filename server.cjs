const express = require("express");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

// fetch compatible CommonJS
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

const staticRoot = path.resolve(__dirname);
app.use(express.static(staticRoot));

const ACTIVATED_JSON = "./json/bunker_activated.json";

app.post("/api/check-new-activations", async (req, res) => {
  const { pdf_url } = req.body;

  if (!pdf_url) {
    return res.status(400).json({ error: "pdf_url manquant" });
  }

  try {
    console.log("Téléchargement du PDF :", pdf_url);

    // Télécharger le PDF
    const response = await fetch(pdf_url);
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Extraire le texte
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Extraire les bunkers activés
    const matches = text.match(/B\/F-\d{4,5}/g) || [];
    const unique = [...new Set(matches)];

    console.log("Bunkers activés trouvés :", unique.length);

    // Sauvegarder dans JSON
    fs.writeFileSync(
      ACTIVATED_JSON,
      JSON.stringify(unique.map(b => ({ bunker: b })), null, 2)
    );

    return res.json({ ok: true, count: unique.length });
  } catch (err) {
    console.error("Erreur traitement PDF :", err.stack || err);
    return res.status(500).json({ error: "Erreur traitement PDF" });
  }
});

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(staticRoot, "index.html"));
});

app.listen(3000, () => {
  console.log("API en écoute sur http://127.0.0.1:3000");
});
