import React, { useState, useEffect } from 'react';

export function Controls() {
  const [scope, setScope] = useState('country');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://geo.api.gouv.fr/departements?fields=code,nom,centre');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setDepartments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

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
                  {dep.nom}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <p className="selection">
        Sélectionné : {scope} {selectedDepartment && `- ${selectedDepartment}`}
      </p>
    </div>
  );
}