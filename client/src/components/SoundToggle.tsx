/**
 * Sound Toggle Component
 * Allows user to enable/disable game sounds
 */

import React, { useState } from 'react';
import { soundManager } from '../utils/SoundManager';
import './SoundToggle.css';

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  const toggleSound = () => {
    const newState = !enabled;
    soundManager.setEnabled(newState);
    setEnabled(newState);
  };

  return (
    <button
      className="sound-toggle"
      onClick={toggleSound}
      title={enabled ? 'Sesleri Kapat' : 'Sesleri Aç'}
      aria-label={enabled ? 'Sesleri Kapat' : 'Sesleri Aç'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
};
