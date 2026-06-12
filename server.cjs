const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const pdfParse = require("pdf-parse");

const app = express();
app.use(express.json());

const ACTIVATED_JSON = "./assets/json/bunker_activated.json";

app.post("/api/check-new-activations", async (req, res) => {
  const { pdf_url } = req.body;

  if (!pdf_url) {
    return res.status(400).json({ error: "pdf_url manquant" });
  }

  try {
    console.log("Téléchargement du PDF :", pdf_url);

    // Télécharger le PDF
    const pdfBuffer = await fetch(pdf_url).then(r => r.buffer());

    // Extraire le texte
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Extraire les bunkers activés
    const matches = text.match(/B\/F-\d{4}/g) || [];
    const unique = [...new Set(matches)];

    console.log("Bunkers activés trouvés :", unique.length);

    // Sauvegarder dans JSON
    fs.writeFileSync(
      ACTIVATED_JSON,
      JSON.stringify(unique.map(b => ({ bunker: b })), null, 2)
    );

    return res.json({ ok: true, count: unique.length });
  } catch (err) {
    console.error("Erreur traitement PDF :", err);
    return res.status(500).json({ error: "Erreur traitement PDF" });
  }
});

app.listen(3000, () => {
  console.log("API en écoute sur http://127.0.0.1:3000");
});
