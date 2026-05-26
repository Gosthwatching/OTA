import React, { useState } from 'react';
import { useDepartements } from '../hooks/useDepartements';
import { config } from '../legacy/config';
import * as overpass from '../legacy/overpass';
import * as pointsOsm from '../legacy/pointsOsm';
import { buildDepartmentGeoJson } from '../legacy/geo';

export function Controls({ mapRef }) {
  const [scope, setScope] = useState('country');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(Object.keys(config.configTypePoint));
  const [dataSource, setDataSource] = useState('local');
  const [status, setStatus] = useState('');
  const { departements: departments, loading, error, ensureGeometry, findByCode } = useDepartements();

  const loadLocalPoints = async (typesSelectionnes) => {
    const points = [];
    const fileForType = (typeKey) => {
      if (typeKey === 'lighthouse') return 'lighthouse.geojson';
      if (typeKey === 'beach') return 'beach.geojson';
      if (typeKey.includes('bunker')) return 'bunkers.geojson';
      return null;
    };

    const filesToFetch = Array.from(new Set(typesSelectionnes.map(fileForType).filter(Boolean)));

    for (const filename of filesToFetch) {
      try {
        const res = await fetch(`/json/${filename}`);
        if (!res.ok) {
          setStatus(`Erreur chargement ${filename}: ${res.status}`);
          continue;
        }
        const geo = await res.json();
        if (!geo || !geo.features) continue;

        for (let i = 0; i < geo.features.length; i += 1) {
          const feat = geo.features[i];
          let lon = null;
          let lat = null;

          if (feat.geometry) {
            const g = feat.geometry;
            if (g.type === 'Point') {
              lon = g.coordinates[0];
              lat = g.coordinates[1];
            } else if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
              const ring = g.type === 'Polygon' ? g.coordinates[0] : (g.coordinates[0] && g.coordinates[0][0]);
              if (ring && ring.length) {
                let sx = 0; let sy = 0;
                for (let j = 0; j < ring.length; j += 1) {
                  sx += ring[j][0];
                  sy += ring[j][1];
                }
                lon = sx / ring.length;
                lat = sy / ring.length;
              }
            }
          }

          if ((lat === null || lon === null) && feat.properties) {
            if (feat.properties.center && typeof feat.properties.center.lat === 'number' && typeof feat.properties.center.lon === 'number') {
              lat = feat.properties.center.lat;
              lon = feat.properties.center.lon;
            }
            if (feat.properties.location && Array.isArray(feat.properties.location)) {
              lon = feat.properties.location[0];
              lat = feat.properties.location[1];
            }
          }

          if (lat === null || lon === null) continue;

          let typeKey = 'unknown';
          if (filename.includes('lighthouse')) typeKey = 'lighthouse';
          if (filename.includes('beach')) typeKey = 'beach';
          if (filename.includes('bunkers')) {
            if (feat.properties && (feat.properties.military === 'bunker' || feat.properties.bunker_type === 'military')) typeKey = 'military_bunker';
            else if (feat.properties && (feat.properties.building === 'bunker')) typeKey = 'civil_bunker';
            else typeKey = 'military_bunker';
          }

          const id = (feat.properties && (feat.properties['@id'] || feat.properties.id)) || feat.id || `local/${filename}/${i}`;
          const nom = (feat.properties && (feat.properties.name || feat.properties.ref || feat.properties.nom)) || '';

          points.push({ id, lat, lon, nom, typePoint: typeKey, estActif: config.idsActifsDemo.has(id) });
        }
      } catch (e) {
        setStatus(`Erreur lecture ${filename}: ${e.message}`);
      }
    }

    return points;
  };

  return (
    <div className="controls">
      <h2>OTA Map</h2>

      <label>Niveau de chargement</label>
      <select value={scope} onChange={(e) => setScope(e.target.value)}>
        <option value="country">Pays entier</option>
        <option value="department">Département</option>
        <option value="single">Point de test</option>
      </select>

      {scope === 'department' && (
        <div className="department-select">
          <label>Département</label>
          {loading ? (
            <p>Chargement...</p>
          ) : error ? (
            <p className="error">Erreur : {error}</p>
          ) : (
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
              <option value="">-- Choisir un département --</option>
              {departments.map((dep) => (
                <option key={dep.code} value={dep.code}>
                  {dep.code} - {dep.nom}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <p className="selection">
        Sélectionné : {scope} {selectedDepartment && `- ${selectedDepartment}`}
      </p>

      <div className="type-selection" style={{ marginTop: '0.75rem' }}>
        <label>Types de points</label>
        {Object.entries(config.configTypePoint).map(([typeKey, typeConfig]) => (
          <div key={typeKey} className="type-option">
            <label>
              <input
                type="checkbox"
                checked={selectedTypes.includes(typeKey)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedTypes((prev) => {
                    if (checked) {
                      return [...prev, typeKey];
                    }
                    return prev.filter((item) => item !== typeKey);
                  });
                }}
              />
              {typeConfig.label}
            </label>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <label>Source des données</label>
        <select value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
          <option value="overpass">Overpass (live)</option>
          <option value="local">Local GeoJSON (demo)</option>
        </select>
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={async () => {
          setStatus('Préparation...');
          const portee = scope;
          let departementChoisi = selectedDepartment ? findByCode(selectedDepartment) : null;

          if (portee === 'department' && !departementChoisi) {
            setStatus('Sélectionne un département.');
            return;
          }

          if (selectedTypes.length === 0) {
            setStatus('Sélectionne au moins un type de point.');
            return;
          }

          try {
            if (portee === 'department') {
              setStatus(`Chargement géométrie ${departementChoisi.code}...`);
              departementChoisi = await ensureGeometry(departementChoisi);
              if (mapRef && mapRef.current && typeof mapRef.current.drawDepartment === 'function') {
                const departmentGeoJson = buildDepartmentGeoJson(departementChoisi);
                mapRef.current.drawDepartment(departmentGeoJson);
              }
            }

            const zoneRecherche = (portee === 'single') ? config.pointTest : (portee === 'country') ? config.zoneFrance : departementChoisi;

            if (!zoneRecherche) {
              setStatus('Zone de recherche indisponible.');
              return;
            }

            const typesSelectionnes = selectedTypes;
            let points = [];
            let sourceAffichee = dataSource;

            if (dataSource === 'overpass') {
              try {
                const requete = overpass.buildQuery(typesSelectionnes, portee, zoneRecherche);
                setStatus('Chargement OSM...');

                const donnees = await overpass.loadWithRetry(requete);
                const elements = donnees.elements || [];

                points = pointsOsm.transform(elements, typesSelectionnes);
                points = pointsOsm.filterByActivation(points, 'all');
              } catch (err) {
                setStatus('Overpass indisponible, bascule vers GeoJSON local...');
                points = await loadLocalPoints(typesSelectionnes);
                sourceAffichee = 'local';
              }
            } else {
              setStatus('Chargement GeoJSON local...');
              points = await loadLocalPoints(typesSelectionnes);
            }

            if (mapRef && mapRef.current && typeof mapRef.current.showPoints === 'function') {
              mapRef.current.showPoints(points, zoneRecherche, portee, config);
            }

            setStatus(`${points.length} points affichés (${points.length} récupérés) — source ${sourceAffichee}.`);
          } catch (err) {
            setStatus(`Echec de chargement: ${err.message || err}`);
          }
        }}>Charger les points</button>
      </div>

      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{status}</p>
    </div>
  );
}