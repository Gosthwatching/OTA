window.OTA = window.OTA || {};

OTA.icons = {
  colors: {
    activationColor: "#4ade80",
    inactiveColor: "#ef4444",
  },

  svg(type, couleur) {
    switch (type) {
      case "lighthouse":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none" />
  <path fill="${couleur}" d="M19.5 8.5H18V10h-1.5V6.5h1V5h-1.03c-.25-2.245-2.16-4-4.47-4a4.51 4.51 0 0 0-4.47 4H6.5v1.5h1V10H6V8.5H4.5v3h2.885L5.885 22h12.23l-1.5-10.5H19.5zM15 10h-2.25V6.5H15zm-3-7.5A3 3 0 0 1 14.955 5h-5.91A3 3 0 0 1 12 2.5m-3 4h2.25V10H9zm-1.385 14l.57-4h7.625l.57 4zM15.6 15H8.4l.5-3.5h6.2z" />
</svg>`;

      case "bunker":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 15 15">
  <path d="M0 0h15v15H0z" fill="none" />
  <path fill="${couleur}" d="M.5 12H3l2-6h5l2 6h2.5c0-6.33-2.33-9.5-7-9.5S.5 5.67.5 12M6 7l-1.5 5h6L9 7z" />
</svg>`;

      case "beach":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none" />
  <g fill="none" stroke="${couleur}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path d="M17.553 16.75a7.5 7.5 0 0 0-10.606 0M18 3.804A6 6 0 0 0 9.804 6l10.392 6A6 6 0 0 0 18 3.804" />
    <path d="M16.732 10C18.39 7.13 18.957 4.356 18 3.804S14.925 5.13 13.268 8M15 9l-3 5.196M3 19.25A2.4 2.4 0 0 1 4 19a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 1 .25" />
  </g>
</svg>`;

      default:
        return `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <circle fill="${couleur}" cx="12" cy="12" r="8"/>
        </svg>`;
    }
  },

  create(typePoint, estActif, couleurFornee) {
    const couleur = couleurFornee || (estActif
      ? this.colors.activationColor
      : this.colors.inactiveColor);

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