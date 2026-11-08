import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Village from './village/Village';
import { creatures } from './data/dummyData';

export default function App() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="app">
      <Dashboard onSelectCreature={setSelectedId} />
      <Village creatures={creatures} selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}