import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-md w-full animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gradient shadow-brand text-3xl mb-3">
            🏡
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Join <span className="text-brand-gradient">HouseFinance</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Start tracking shared expenses today</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-6 sm:p-8 border border-slate-100">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-4 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white outline-none text-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white outline-none text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white outline-none text-sm"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white outline-none text-sm"
                placeholder="Repeat your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient text-white py-3 px-4 rounded-xl font-semibold shadow-brand hover:shadow-card-hover hover:-translate-y-0.5 disabled:opacity-60 text-sm tracking-wide mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-800 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
