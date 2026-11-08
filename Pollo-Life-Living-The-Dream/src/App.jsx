import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Village from './village/Village';
import SideMenu from './components/SideMenu';
import AccountSettings from './components/AccountSettings';
import { creatures } from './data/dummyData';

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('home'); 
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);
  const navigate = (next) => {
    setView(next);
    setMenuOpen(false);
  };

  return (
    <div className="app">
      {view === 'account' ? (
        <AccountSettings onBack={() => setView('home')} onOpenMenu={openMenu} />
      ) : (
        <>
          <Dashboard onSelectCreature={setSelectedId} onOpenMenu={openMenu} />
          <Village creatures={creatures} selectedId={selectedId} onSelect={setSelectedId} />
        </>
      )}

      <SideMenu open={menuOpen} view={view} onClose={closeMenu} onNavigate={navigate} />
    </div>
  );
}