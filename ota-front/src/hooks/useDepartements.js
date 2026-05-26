import { useState, useEffect } from 'react';
import { config } from '../legacy/config';
import { contourToBbox, bboxCenter, extractLonLat } from '../legacy/geo';

function createFromApi(depApi) {
  let bbox = contourToBbox(depApi.contour);
  if (!bbox) bbox = depApi.centre ? bboxCenter([depApi.centre[0], depApi.centre[1]]) : null;
  // fallback: compute centre from centre property
  let centre = null;
  if (bbox) centre = bboxCenter(bbox);
  const point = extractLonLat(depApi.centre);
  if (point) centre = [point.lat, point.lon];
  return {
    code: String(depApi.code),
    nom: depApi.nom,
    bbox,
    centre,
    zoom: 9,
    contour: depApi.contour || null,
  };
}

export function useDepartements() {
  const [departements, setDepartements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(config.urlApiDepartements);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.map(createFromApi);
        if (mounted) setDepartements(list);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function ensureGeometry(departement) {
    if (!departement || departement.bbox) return departement;
    try {
      const url = `${config.urlApiDepartementParCodeBase}/${encodeURIComponent(departement.code)}?fields=code,nom,centre,contour`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const dep = await res.json();
      const enriched = createFromApi(dep);
      // merge into existing object
      departement.nom = enriched.nom;
      departement.bbox = enriched.bbox;
      departement.centre = enriched.centre;
      departement.contour = enriched.contour;
      return departement;
    } catch (err) {
      throw err;
    }
  }

  function findByCode(code) {
    return departements.find(d => d.code === String(code));
  }

  return { departements, loading, error, ensureGeometry, findByCode };
}
