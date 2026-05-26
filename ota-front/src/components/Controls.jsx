import React, { useState } from 'react';
import { useDepartements } from '../hooks/useDepartements';
import { config } from '../legacy/config';
import * as overpass from '../legacy/overpass';
import * as pointsOsm from '../legacy/pointsOsm';

export function Controls({ mapRef }) {
  const [scope, setScope] = useState('country');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [status, setStatus] = useState('');
  const { departements: departments, loading, error, ensureGeometry, findByCode } = useDepartements();

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

      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={async () => {
          setStatus('Préparation...');
          const portee = scope;
          let departementChoisi = selectedDepartment ? findByCode(selectedDepartment) : null;

          if (portee === 'department' && !departementChoisi) {
            setStatus('Sélectionne un département.');
            return;
          }

          try {
            if (portee === 'department') {
              setStatus(`Chargement géométrie ${departementChoisi.code}...`);
              departementChoisi = await ensureGeometry(departementChoisi);
            }

            const zoneRecherche = (portee === 'single') ? config.pointTest : (portee === 'country') ? config.zoneFrance : departementChoisi;

            if (!zoneRecherche) {
              setStatus('Zone de recherche indisponible.');
              return;
            }

            const typesSelectionnes = Object.keys(config.configTypePoint);

            const requete = overpass.buildQuery(typesSelectionnes, portee, zoneRecherche);
            setStatus('Chargement OSM...');

            const donnees = await overpass.loadWithRetry(requete);
            const elements = donnees.elements || [];

            const points = pointsOsm.transform(elements, typesSelectionnes);
            const pointsFiltres = pointsOsm.filterByActivation(points, 'all');

            if (mapRef && mapRef.current && typeof mapRef.current.showPoints === 'function') {
              mapRef.current.showPoints(pointsFiltres, zoneRecherche, portee, config);
            }

            setStatus(`${pointsFiltres.length} points affichés (${points.length} récupérés).`);
          } catch (err) {
            setStatus(`Echec de chargement: ${err.message || err}`);
          }
        }}>Charger les points</button>
      </div>

      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{status}</p>
    </div>
  );
}