/**
 * Ust navbar bileseni.
 * Kullanici bilgisi, cuzdan/email ikonu ve cikis butonu gosterir.
 * Oyun sirasinda minimal mod (32px, yari seffaf).
 */

import React, { useState } from 'react';
import './Navbar.css';

interface NavbarProps {
  username: string | null;
  playerId: string | null;
  authType: 'wallet' | 'email' | null;
  onLogout: () => void;
  minimal?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ username, playerId, authType, onLogout, minimal }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = username || (playerId ? playerId.slice(0, 8) : '');
  const shortId = playerId
    ? playerId.length > 16
      ? `${playerId.slice(0, 6)}...${playerId.slice(-4)}`
      : playerId.slice(0, 12)
    : '';

  const authIcon = authType === 'wallet' ? '\u{1F4B3}' : '\u{1F4E7}'; // wallet or email icon

  if (minimal) {
    return (
      <div className="navbar navbar-minimal">
        <span className="navbar-name-minimal">{displayName}</span>
        <div className="navbar-menu-container">
          <button
            className="navbar-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            &#x22EE;
          </button>
          {menuOpen && (
            <div className="navbar-dropdown" onClick={() => setMenuOpen(false)}>
              <div className="navbar-dropdown-item navbar-dropdown-id">
                {authIcon} {shortId}
              </div>
              <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="navbar">
      <div className="navbar-left">
        <span className="navbar-auth-icon">{authIcon}</span>
        <span className="navbar-username">{displayName}</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-id">ID: {shortId}</span>
        <button className="navbar-logout-btn" onClick={onLogout}>
          Cikis
        </button>
      </div>
    </div>
  );
};

export default Navbar;
