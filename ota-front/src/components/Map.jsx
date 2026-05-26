import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure Leaflet's default icon URLs work with Vite bundling
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export const Map = forwardRef(function Map(_, ref) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pointsLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const departementLayerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView([46.5, 2], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    pointsLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    departementLayerRef.current = null;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    goTo(centre, zoom) {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.setView(centre, zoom);
    },

    fitBbox(bbox) {
      if (!mapInstanceRef.current || !bbox) return;
      mapInstanceRef.current.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ]);
    },

    drawDepartment(departement, geoJson) {
      if (!mapInstanceRef.current) return;
      if (departementLayerRef.current) {
        mapInstanceRef.current.removeLayer(departementLayerRef.current);
        departementLayerRef.current = null;
      }

      const gj = geoJson;
      if (!gj) return;

      departementLayerRef.current = L.geoJSON(gj, {
        style: {
          color: '#0ea5e9',
          weight: 2,
          fillColor: '#7dd3fc',
          fillOpacity: 0.15,
        },
      }).addTo(mapInstanceRef.current);
    },

    showPoints(points, zoneRecherche, portee, config) {
      if (!mapInstanceRef.current || !pointsLayerRef.current) return;
      pointsLayerRef.current.clearLayers();

      if (portee === 'single') {
        const p = config.pointTest;
        mapInstanceRef.current.setView([p.lat, p.lon], 13);
      } else if (zoneRecherche && zoneRecherche.bbox) {
        mapInstanceRef.current.fitBounds([
          [zoneRecherche.bbox[0], zoneRecherche.bbox[1]],
          [zoneRecherche.bbox[2], zoneRecherche.bbox[3]],
        ]);
      }

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const cfg = (config && config.configTypePoint && config.configTypePoint[point.typePoint]) || { couleur: '#3388ff', nom: point.typePoint };

        const marqueur = L.circleMarker([point.lat, point.lon], {
          radius: 6,
          color: cfg.couleur,
          fillOpacity: 0.8,
        });

        const nomAffiche = point.nom || '(sans nom)';
        const texteActivation = point.estActif ? 'active' : 'pas active';

        const popup = `\n<strong>${nomAffiche}</strong>\n<p class=\"popup-line\">${cfg.nom}</p>\n<p class=\"popup-line\">Statut: ${texteActivation}</p>\n<a target=\"_blank\" href=\"https://www.openstreetmap.org/${point.id}\">Voir sur OSM</a>`;

        marqueur.bindPopup(popup);
        marqueur.addTo(pointsLayerRef.current);
      }
    },
  }));

  return <div ref={containerRef} className="map-container" />;
});
