import { useState } from 'react';
import AuthProvider from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import BankProvider from './bank/BankProvider';
import Login from './components/Login';
import Home from './components/Home';
import AccountSettings from './components/AccountSettings';
import SideMenu from './components/SideMenu';
import CreaturesProvider from './creatures/CreaturesProvider';
import './live-data.css';

function AppShell() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('home'); // 'home' | 'account'
  const [menuOpen, setMenuOpen] = useState(false);

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
  };

  if (!user) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }

  // BankProvider only exists while signed in, so signing out clears the bank data too.
  return (
    <BankProvider>
      <CreaturesProvider>
      <div className={`app ${view === 'home' ? 'app-home' : ''}`}>
        {view === 'account' ? (
          <AccountSettings onBack={() => setView('home')} onOpenMenu={openMenu} onSignOut={signOut} />
        ) : (
          <Home onOpenMenu={openMenu} />
        )}

        <SideMenu open={menuOpen} view={view} onClose={closeMenu} onNavigate={navigate} />
      </div>
      </CreaturesProvider>
    </BankProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
