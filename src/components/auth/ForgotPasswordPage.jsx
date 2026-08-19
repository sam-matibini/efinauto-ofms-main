import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!email) { setError('Enter your email address.'); return; }
    setBusy(true);
    try {
      await base44.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not send the reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <a href="/login" style={S.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Login
        </a>

        <div style={S.logoWrap}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png"
            alt="eFinAuto"
            style={S.logo}
          />
        </div>

        {done ? (
          <>
            <div style={S.checkCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 style={S.title}>Check your email</h1>
            <p style={S.subtitle}>
              We sent a password reset link to <strong>{email}</strong>. Follow the instructions in the email to set a new password.
            </p>
            <p style={{ ...S.subtitle, marginTop: 0 }}>
              Didn't receive it? Check your spam folder or{' '}
              <button type="button" onClick={() => { setDone(false); setEmail(''); }} style={S.toggleBtn}>
                try a different email
              </button>
            </p>
            <a href="/login" style={S.primaryBtn}>
              Back to Login
            </a>
          </>
        ) : (
          <>
            <h1 style={S.title}>Forgot your password?</h1>
            <p style={S.subtitle}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={S.label} htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={S.input}
              />

              <button type="submit" style={S.primaryBtn} disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            {error && <p style={S.error}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: 'inherit',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '36px 32px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center',
    position: 'relative',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    position: 'absolute',
    top: 16,
    left: 20,
    fontSize: '13px',
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: 500,
  },
  logoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eef2ff',
    overflow: 'hidden',
  },
  logo: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 4px',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '14px',
    margin: '0 0 28px',
    color: '#64748b',
  },
  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 6px',
    color: '#0f172a',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
    background: '#fff',
    color: '#0f172a',
    outline: 'none',
  },
  primaryBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#ffffff',
    textDecoration: 'none',
    textAlign: 'center',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6366f1',
    padding: 0,
  },
  error: {
    fontSize: '13px',
    marginTop: '16px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
  },
  checkCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdf4',
    border: '2px solid #bbf7d0',
  },
};
