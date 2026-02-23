import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Mic, Mail, Pin } from 'lucide-react';
import './Layout.css';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/corkboard', icon: Pin, label: 'Board' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/memories', icon: Mic, label: 'Memories' },
  { to: '/digest', icon: Mail, label: 'Digest' },
];

export default function Layout({ children }) {
  return (
    <div className="layout">
      <header className="layout-header">
        <h1 className="layout-title">Family Hub</h1>
      </header>
      <main className="layout-main">
        {children}
      </main>
      <nav className="layout-nav" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
