import { config } from './config';
import { bboxToText } from './geo';

export function buildPart(type, portee, zoneRecherche) {
  const cfg = config.configTypePoint[type];
  const pointTest = config.pointTest;
  let selecteur = '';

  if (portee === 'single') {
    selecteur = `(around:${pointTest.rayonMetres},${pointTest.lat},${pointTest.lon})`;
  } else {
    selecteur = `(${bboxToText(zoneRecherche.bbox)})`;
  }

  const inclureRelations = portee !== 'country';

  const morceaux = [`node${selecteur}[${cfg.tag}];`, `way${selecteur}[${cfg.tag}];`];
  if (inclureRelations) morceaux.push(`relation${selecteur}[${cfg.tag}];`);
  return morceaux.join('');
}

export function buildQuery(typesSelectionnes, portee, zoneRecherche) {
  const morceaux = typesSelectionnes.map(t => buildPart(t, portee, zoneRecherche));
  const timeoutSeconds = portee === 'country' ? 60 : 25;
  return `[out:json][timeout:${timeoutSeconds}];(${morceaux.join('')});out body center;`;
}

export async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loadWithRetry(requeteOverpass) {
  const urls = config.urlsOverpass;
  const cfg = config.overpass;
  let lastError = new Error('Erreur reseau inconnue.');

  for (let i = 0; i < urls.length; i += 1) {
    const endpoint = urls[i];
    for (let attempt = 1; attempt <= cfg.maxTentativesParEndpoint; attempt += 1) {
      try {
        const response = await fetchWithTimeout(endpoint, { method: 'POST', body: requeteOverpass }, cfg.timeoutMs);
        if (!response.ok) {
          const e = new Error(`Erreur HTTP ${response.status}`);
          e.status = response.status;
          throw e;
        }
        return await response.json();
      } catch (err) {
        lastError = err;
        const hasNextAttempt = attempt < cfg.maxTentativesParEndpoint;
        const hasNextEndpoint = i < urls.length - 1;
        if (!hasNextAttempt && !hasNextEndpoint) break;
        const waitMs = cfg.backoffBaseMs * attempt;
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }
  throw lastError;
}
