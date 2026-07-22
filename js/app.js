(function() {
  const scripts = [
    './js/config.js',
    './js/geo.js',
    './js/ui.js',
    './js/departements.js',
    './js/overpass.osm.js',
    './js/points-osm.js',
    './js/points-loader.js',
    './js/icons.js',
    './js/carte.js',
    './js/geolocalisation.js',
    './main.js',
    './js/scope-dropdown.js'
  ];

  scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = `${src}?v=8`;
    script.async = false; //assure que les scripts sont chargés dans l'ordre
    document.body.appendChild(script);
  });
})();
