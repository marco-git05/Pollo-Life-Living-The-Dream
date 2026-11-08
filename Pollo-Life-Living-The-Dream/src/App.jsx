import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Village from './village/Village';
import SideMenu from './components/SideMenu';
import AccountSettings from './components/AccountSettings';
import AuthProvider from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import Login from './components/Login';
import { creatures } from './data/dummyData';

function AppShell() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('home'); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);
  const navigate = (next) => {
    setView(next);
    setMenuOpen(false);
  };
  const signOut = () => {
    logout();
    setView('home');
    setMenuOpen(false);
    setSelectedId(null);
  };

  if (!user) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }

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

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}