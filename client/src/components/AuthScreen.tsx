/**
 * Auth ekrani.
 * Cuzdan baglama ve email ile giris/kayit tablari.
 */

import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../solana/WalletContext';
import './AuthScreen.css';

type AuthTab = 'wallet' | 'email';
type EmailMode = 'login' | 'register';

const AuthScreen: React.FC = () => {
  const { connectWallet, loginWithEmail, registerWithEmail } = useAuth();
  const { connecting } = useWallet();

  const [activeTab, setActiveTab] = useState<AuthTab>('wallet');
  const [emailMode, setEmailMode] = useState<EmailMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleWalletConnect = async () => {
    setError(null);
    try {
      await connectWallet();
    } catch (err: any) {
      setError(err.message || 'Cuzdan baglanamiyor');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (emailMode === 'register' && password !== passwordConfirm) {
      setError('Sifreler eslesmiyor');
      return;
    }

    setLoading(true);
    try {
      const result = emailMode === 'login'
        ? await loginWithEmail(email, password)
        : await registerWithEmail(email, password);

      if (!result.success) {
        setError(result.error || 'Islem basarisiz');
      }
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen hata');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-logo">
        <h1>Batak Tournament</h1>
        <p>NFT-Rewarded Card Game on Solana</p>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => { setActiveTab('wallet'); setError(null); }}
          >
            Cuzdan Bagla
          </button>
          <button
            className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => { setActiveTab('email'); setError(null); }}
          >
            Email ile Giris
          </button>
        </div>

        <div className="auth-content">
          {activeTab === 'wallet' && (
            <div className="auth-wallet-tab">
              <p className="auth-desc">
                Solana cuzdaninizi baglayarak giris yapin.
                Phantom, Backpack veya Seeker desteklenir.
              </p>
              <button
                className="btn-primary w-full"
                onClick={handleWalletConnect}
                disabled={connecting}
              >
                {connecting ? 'Baglaniyor...' : 'Cuzdan Bagla'}
              </button>
              <p className="auth-hint">
                Cuzdaniniz yoksa test modunda otomatik olusturulur.
              </p>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="auth-email-tab">
              <div className="email-mode-toggle">
                <button
                  className={`email-mode-btn ${emailMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setEmailMode('login'); setError(null); }}
                >
                  Giris Yap
                </button>
                <button
                  className={`email-mode-btn ${emailMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setEmailMode('register'); setError(null); }}
                >
                  Kayit Ol
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="auth-form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label>Sifre</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                    autoComplete={emailMode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>

                {emailMode === 'register' && (
                  <div className="form-group">
                    <label>Sifre Tekrar</label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Sifrenizi tekrarlayin"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? 'Isleniyor...' : emailMode === 'login' ? 'Giris Yap' : 'Kayit Ol'}
                </button>
              </form>

              <p className="auth-hint">
                {emailMode === 'login'
                  ? 'Hesabiniz yok mu? Kayit Ol butonuna basin.'
                  : 'Zaten hesabiniz var mi? Giris Yap butonuna basin.'
                }
              </p>
            </div>
          )}

          {error && (
            <div className="auth-error">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
