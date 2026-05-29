window.OTA = window.OTA || {};

OTA.geolocalisation = {
  locateMe() {
    if (!navigator.geolocation) {
      OTA.ui.showStatus("Geolocalisation non supportee.");
      return;
    }

    OTA.ui.showStatus("Recherche de ta position...");

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        OTA.etat.coucheUtilisateur.clearLayers();

        const marqueur = L.marker([lat, lon]).addTo(OTA.etat.coucheUtilisateur);
        marqueur.bindPopup("Tu es ici").openPopup();

        OTA.etat.carte.setView([lat, lon], 13);
        OTA.ui.showStatus("Position detectee.");
      },
      erreur => {
        OTA.ui.showStatus(`Geolocalisation refusee/indisponible: ${erreur.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  },
};
