import { useRef } from 'react';
import { Controls } from './components/Controls';
import { Map } from './components/Map';

export default function App() {
  const mapRef = useRef(null);

  return (
    <div className="app">
      <aside className="sidebar">
        <Controls mapRef={mapRef} />
      </aside>
      <main className="map-area">
        <Map ref={mapRef} />
      </main>
    </div>
  );
}
