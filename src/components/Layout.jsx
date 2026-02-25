import { Link, useLocation } from 'react-router-dom';
import { Archive } from 'lucide-react';
import './Layout.css';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const onArchive = pathname === '/archive';

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-title-link">
          <h1 className="layout-title">Bridge Four</h1>
        </Link>
        {!onArchive && (
          <Link to="/archive" className="layout-archive-link">
            <Archive size={18} />
            <span>Archive</span>
          </Link>
        )}
        {onArchive && (
          <Link to="/" className="layout-archive-link">
            ← Board
          </Link>
        )}
      </header>
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
