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
  const { connecting, connected, availableWallets } = useWallet();

  // Default to email tab on mobile, wallet on desktop
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<AuthTab>(isMobile ? 'email' : 'wallet');
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
      console.error('[AuthScreen] Wallet connection error:', err);
      setError(err.message || 'Wallet connection failed. Please try again.');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (emailMode === 'register' && password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = emailMode === 'login'
        ? await loginWithEmail(email, password)
        : await registerWithEmail(email, password);

      if (!result.success) {
        setError(result.error || 'Operation failed');
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
            Connect Wallet
          </button>
          <button
            className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => { setActiveTab('email'); setError(null); }}
          >
            Login with Email
          </button>
        </div>

        <div className="auth-content">
          {activeTab === 'wallet' && (
            <div className="auth-wallet-tab">
              <p className="auth-desc">
                Sign in with your Solana wallet.
                Phantom, Backpack or Seeker supported.
              </p>

              {availableWallets.length > 0 && (
                <div className="detected-wallets">
                  <p className="detected-wallets-label">Available options:</p>
                  {availableWallets.map((wallet, index) => (
                    <span key={index} className="detected-wallet-badge">{wallet}</span>
                  ))}
                </div>
              )}

              <button
                className="btn-primary w-full"
                onClick={handleWalletConnect}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : connected ? 'Connected ✓' : 'Sign In'}
              </button>

              <p className="auth-hint">
                {!connected && 'Test mode on mobile, wallet connection on desktop'}
                {connected && 'Connected! Redirecting...'}
              </p>

              <p className="auth-hint" style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8, color: '#fbbf24' }}>
                💡 On mobile, use "Login with Email" for easier access
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
                  Sign In
                </button>
                <button
                  className={`email-mode-btn ${emailMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setEmailMode('register'); setError(null); }}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="auth-form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete={emailMode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>

                {emailMode === 'register' && (
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat your password"
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
                  {loading ? 'Processing...' : emailMode === 'login' ? 'Sign In' : 'Register'}
                </button>
              </form>

              <p className="auth-hint">
                {emailMode === 'login'
                  ? 'No account? Click Register.'
                  : 'Already have an account? Click Sign In.'
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
