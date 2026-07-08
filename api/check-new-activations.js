import pdfParse from "pdf-parse/lib/pdf-parse.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Methode non autorisee" });
  }

  const pdfUrl = req.body?.pdf_url;
  if (!pdfUrl) {
    return res.status(400).json({ error: "pdf_url manquant" });
  }

  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return res.status(502).json({
        error: "Impossible de telecharger le PDF",
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(pdfBuffer);
    const matches = data.text.match(/B\/F-\d{4,5}/g) || [];
    const bunkers = [...new Set(matches)].map(bunker => ({ bunker }));

    return res.status(200).json({
      ok: true,
      count: bunkers.length,
      bunkers,
    });
  } catch (error) {
    console.error("Erreur traitement PDF :", error);
    return res.status(500).json({ error: "Erreur traitement PDF" });
  }
}