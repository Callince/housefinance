import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function HouseSetup() {
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/houses/', { name, monthly_rent: parseFloat(rent) });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create house');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/houses/join', { invite_code: inviteCode });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join house');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
          <p className="text-gray-500 mb-8">Create a new house or join an existing one</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('create')}
              className="p-6 bg-white rounded-xl shadow-md border-2 border-transparent hover:border-indigo-500 transition"
            >
              <div className="text-4xl mb-3">+</div>
              <div className="font-semibold text-gray-900">Create House</div>
              <div className="text-sm text-gray-500 mt-1">Set up a new shared house</div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="p-6 bg-white rounded-xl shadow-md border-2 border-transparent hover:border-indigo-500 transition"
            >
              <div className="text-4xl mb-3">&#x1f517;</div>
              <div className="font-semibold text-gray-900">Join House</div>
              <div className="text-sm text-gray-500 mt-1">Use an invite code</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <button
          onClick={() => { setMode(null); setError(''); }}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          &larr; Back
        </button>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {mode === 'create' ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create a House</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g., Sunrise Apartment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Monthly Rent (Rs)
                </label>
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g., 15000"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Creating...' : 'Create House'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Join a House</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Enter invite code"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Joining...' : 'Join House'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
