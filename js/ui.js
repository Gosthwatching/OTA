// Interface : statut, cases à cocher, texte HTML
window.OTA = window.OTA || {};

OTA.ui = {
  showStatus: function (texte) {
    OTA.etat.dom.zoneStatut.textContent = texte;
  },

  escapeHtml: function (texte) {
    return texte
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  },

  readCheckedTypes: function () {
    // Support legacy fieldset checkboxes and the new dropdown (.types-dropdown)
    const cases = document.querySelectorAll('.types-dropdown input[type="checkbox"], fieldset input[type="checkbox"]');
    const types = [];

    for (let i = 0; i < cases.length; i += 1) {
      if (cases[i].checked) {
        types.push(cases[i].value);
      }
    }

    return types;
  },
};
