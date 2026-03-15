import React, { useState } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import './UsernameInput.css';

interface UsernameInputProps {
  onComplete: (username: string) => void;
}

const UsernameInput: React.FC<UsernameInputProps> = ({ onComplete }) => {
  const { socket } = useSocket();
  const { playerId } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleSave = () => {
    if (!socket || !playerId || !isValid) return;
    setError(null);
    setSaving(true);

    socket.emit('set_username', { publicKey: playerId, username }, (response: any) => {
      setSaving(false);
      if (response.error) {
        setError(response.error);
      } else {
        onComplete(response.username);
      }
    });
  };

  const handleSkip = () => {
    onComplete('');
  };

  return (
    <div className="username-screen">
      <div className="username-card">
        <h2>Choose Username</h2>
        <p className="username-desc">Your in-game display name</p>

        <input
          type="text"
          className={`username-input ${username.length > 0 && !isValid ? 'invalid' : ''}`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username..."
          maxLength={20}
          autoFocus
        />

        <div className="username-rules">
          <span className={username.length >= 3 ? 'valid' : ''}>3-20 characters</span>
          <span className={/^[a-zA-Z0-9_]*$/.test(username) || username.length === 0 ? 'valid' : ''}>Letters, numbers, underscore</span>
        </div>

        {error && <div className="username-error">{error}</div>}

        <button
          className="btn-primary w-full"
          onClick={handleSave}
          disabled={!isValid || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button className="btn-skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  );
};

export default UsernameInput;
