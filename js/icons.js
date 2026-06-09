window.OTA = window.OTA || {};

OTA.icons = {
  colors: {
    activationColor: "#4ade80",
    inactiveColor: "#ef4444",
  },

  svg(type, couleur) {
    switch (type) {
      case "lighthouse":
        return `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">     
          <path fill="${couleur}" d="M12 2L4 20h16L12 2zm0 4.5L16.2 18H7.8L12 6.5z"/>
        </svg>`;

      case "bunker":
        return `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <path fill="${couleur}" d="M3 20V8l9-6 9 6v12H3zm2-2h14v-9.5l-7-4.7-7 4.7V18z"/>
        </svg>`;

      case "beach":
        return `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <circle fill="${couleur}" cx="17.5" cy="6" r="3.5"/>
          <path fill="${couleur}" d="M17.5 1.2v1.6M17.5 9.2v1.6M21.8 6h-1.6M13.2 6h-1.6M20.6 2.9l-1.1 1.1M14.4 9.1l-1.1 1.1M20.6 9.1l-1.1-1.1M14.4 2.9l-1.1-1.1"/>
          <path fill="${couleur}" d="M1 13.8h22v1.4H1z"/>
          <path fill="${couleur}" d="M1 17c2.3-1.1 4.6-1.1 6.9 0 2.3 1.1 4.6 1.1 6.9 0 2.3-1.1 4.6-1.1 6.9 0"/>
          <path fill="${couleur}" d="M1 20.2c2.3-1.1 4.6-1.1 6.9 0 2.3 1.1 4.6 1.1 6.9 0 2.3-1.1 4.6-1.1 6.9 0"/>
        </svg>`;

      default:
        return `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <circle fill="${couleur}" cx="12" cy="12" r="8"/>
        </svg>`;


        
    }
  },

  create(typePoint, estActif) {
    const couleur = estActif
      ? this.colors.activationColor
      : this.colors.inactiveColor;

    const html = this.svg(typePoint, couleur);

    return L.divIcon({
      className: "ota-marker-icon",
      html: html,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  },
};