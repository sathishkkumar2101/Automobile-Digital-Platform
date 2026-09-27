import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roleBasedRedirect } from '../../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(roleBasedRedirect(user.role), { replace: true });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('401') || msg.includes('500') || msg.includes('Internal Server Error') || msg.toLowerCase().includes('credential') || err.status === 401) {
        setError('Invalid email or password. Please verify your credentials.');
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left panel – image */}
      <div className="hidden lg:block lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&h=1200&fit=crop&auto=format"
          alt="Premium vehicle"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/30 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-xs">
          <p className="font-display text-4xl font-bold text-white leading-tight mb-3">
            Premium<br />Automotive<br />Platform
          </p>
          <p className="text-sm text-zinc-400">Enterprise vehicle management and discovery for discerning buyers and operators.</p>
        </div>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/20 to-transparent" />
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white tracking-widest uppercase">AutoPrime</p>
              <p className="text-xs text-zinc-600 tracking-wider">Enterprise Platform</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-white mb-1">Sign in</h1>
            <p className="text-sm text-zinc-500">Access your portal with your credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder:text-zinc-600 px-3 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder:text-zinc-600 px-3 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded">
                <span className="text-red-400 text-xs mt-0.5">✕</span>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-white text-zinc-900 text-sm font-semibold rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded border border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Demo credentials</p>
            <div className="space-y-1 text-xs text-zinc-300">
              <p><span className="text-zinc-500">Admin:</span> admin@bmwtechworks.com / Admin@123</p>
              <p><span className="text-zinc-500">Dealer:</span> dealer1@bmwtechworks.com / Dealer@123</p>
              <p><span className="text-zinc-500">Customer:</span> customer1@bmwtechworks.com / Customer@123</p>
            </div>
          </div>

          <p className="text-xs text-zinc-500 text-center mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
