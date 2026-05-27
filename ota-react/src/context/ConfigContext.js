import React from 'react';

const ConfigContext = React.createContext({
  overpassUrl: 'https://overpass-api.de/api/interpreter',
});

export function ConfigProvider({ children }) {
  const config = { overpassUrl: 'https://overpass-api.de/api/interpreter' };
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export default ConfigContext;
