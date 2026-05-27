import React from 'react';
import { Controls } from './components/Controls';
import { Map } from './components/Map';
import './index.css';

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <Controls />
      </aside>
      <main className="map-area">
        <Map />
      </main>
    </div>
  );
}
