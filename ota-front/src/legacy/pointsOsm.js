import { config } from './config';

export function extractCoordinates(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') return { lat: element.lat, lon: element.lon };
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') return { lat: element.center.lat, lon: element.center.lon };
  return null;
}

export function findType(element) {
  const tags = element.tags || {};
  if (tags.man_made === 'lighthouse') return 'lighthouse';
  if (tags.natural === 'beach') return 'beach';
  if (tags.military === 'bunker') return 'military_bunker';
  if (tags.building === 'bunker') return 'civil_bunker';
  return null;
}

export function transform(elementsOsm, typesSelectionnes) {
  const points = [];
  for (let i = 0; i < elementsOsm.length; i += 1) {
    const element = elementsOsm[i];
    const typePoint = findType(element);
    if (!typePoint || !typesSelectionnes.includes(typePoint)) continue;
    const coord = extractCoordinates(element);
    if (!coord) continue;
    const id = `${element.type}/${element.id}`;
    let nom = '';
    if (element.tags) {
      if (element.tags.name) nom = element.tags.name;
      else if (element.tags.ref) nom = element.tags.ref;
    }
    points.push({ id, lat: coord.lat, lon: coord.lon, nom, typePoint, estActif: config.idsActifsDemo.has(id) });
  }
  return points;
}

export function filterByActivation(points, filtreActivation) {
  if (filtreActivation === 'activated') return points.filter(p => p.estActif);
  if (filtreActivation === 'not-activated') return points.filter(p => !p.estActif);
  return points;
}
