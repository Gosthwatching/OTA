window.OTA = window.OTA || {};

OTA.icons = {
  colors: {
    activationColor: "#22c55e",
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
          <path fill="${couleur}" d="M12 2.5a7.5 7.5 0 0 0-7.5 7.5h15A7.5 7.5 0 0 0 12 2.5z"/>
          <path fill="${couleur}" d="M12 10v8.5"/>
          <path fill="${couleur}" d="M8.5 21h7v-1.2h-7V21z"/>
          <path fill="${couleur}" d="M2 18.2c1.8-.8 3.4-.8 5.2 0 1.8.8 3.4.8 5.2 0 1.8-.8 3.4-.8 5.2 0 1.8.8 3.4.8 5.2 0v.8H2v-.8z"/>
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