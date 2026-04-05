import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { formatRs } from '../utils/formatCurrency';
import NotificationBell from '../components/NotificationBell';

export default function HouseSettings() {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState(1);
  const [memberRents, setMemberRents] = useState({});
  const [memberMealDays, setMemberMealDays] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const DAYS = [
    { num: 0, label: 'Mon' },
    { num: 1, label: 'Tue' },
    { num: 2, label: 'Wed' },
    { num: 3, label: 'Thu' },
    { num: 4, label: 'Fri' },
    { num: 5, label: 'Sat' },
    { num: 6, label: 'Sun' },
  ];

  useEffect(() => {
    fetchHouse();
  }, [houseId]);

  const fetchHouse = async () => {
    try {
      const res = await api.get(`/houses/${houseId}`);
      setHouse(res.data);
      setName(res.data.name);
      setRent(res.data.monthly_rent.toString());
      setDueDay(res.data.rent_due_day || 1);
      const rents = {};
      const mealDays = {};
      res.data.members.forEach((m) => {
        rents[m.id] = m.rent_amount.toString();
        const days = (m.meal_days || '0,1,2,3,4,5,6')
          .split(',')
          .map((d) => parseInt(d))
          .filter((d) => !isNaN(d));
        mealDays[m.id] = new Set(days);
      });
      setMemberRents(rents);
      setMemberMealDays(mealDays);
    } catch (err) {
      setError('Failed to load house');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHouse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`/houses/${houseId}`, {
        name,
        monthly_rent: parseFloat(rent),
        rent_due_day: parseInt(dueDay),
      });
      setSuccess('House updated');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update');
    }
  };

  const toggleMealDay = (memberId, dayNum) => {
    setMemberMealDays((prev) => {
      const cur = new Set(prev[memberId] || []);
      if (cur.has(dayNum)) cur.delete(dayNum);
      else cur.add(dayNum);
      return { ...prev, [memberId]: cur };
    });
  };

  const handleSaveMealDays = async (memberId) => {
    setError('');
    setSuccess('');
    try {
      const days = Array.from(memberMealDays[memberId] || []).sort((a, b) => a - b);
      await api.put(`/houses/${houseId}/members/${memberId}/meal-days`, {
        meal_days: days.join(','),
      });
      setSuccess('Meal days updated');
      fetchHouse();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update meal days');
    }
  };

  const handleUpdateMemberRent = async (memberId) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/houses/${houseId}/members/${memberId}/rent`, {
        rent_amount: parseFloat(memberRents[memberId] || 0),
      });
      setSuccess('Rent updated');
      fetchHouse();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update rent');
    }
  };

  const totalAssigned = Object.values(memberRents).reduce(
    (sum, v) => sum + (parseFloat(v) || 0), 0
  );
  const totalRent = parseFloat(rent) || 0;
  const remaining = totalRent - totalAssigned;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(house.invite_code);
    setSuccess('Invite code copied!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!house) return <div className="p-8 text-center text-red-500">House not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6">
      <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 sm:mb-4">
        &larr; Back to Dashboard
      </button>

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">House Settings</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Push Notifications */}
      <div className="mb-4 sm:mb-6">
        <NotificationBell />
      </div>

      {/* Invite Code */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Invite Code</h2>
        <div className="flex items-center gap-3">
          <code className="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono tracking-wider">
            {house.invite_code}
          </code>
          <button
            onClick={copyInviteCode}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Share this code with housemates to join</p>
      </div>

      {/* House Details */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">House Details</h2>
        <form onSubmit={handleUpdateHouse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">House Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Monthly Rent (Rs)</label>
            <input
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rent Due Day (of each month)</label>
            <select
              value={dueDay}
              onChange={(e) => setDueDay(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : d === 21 ? 'st' : d === 22 ? 'nd' : d === 23 ? 'rd' : d === 31 ? 'st' : 'th'} of every month
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Admin only: rent is due by this day each month</p>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Update House
          </button>
        </form>
      </div>

      {/* Member Rent Allocation */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Rent Allocation</h2>
        <p className="text-sm text-gray-500 mb-4">
          Total Rent: {formatRs(totalRent)} | Assigned: {formatRs(totalAssigned)} |
          <span className={remaining === 0 ? ' text-green-600' : ' text-red-600'}>
            {' '}Remaining: {formatRs(remaining)}
          </span>
        </p>

        <div className="space-y-3">
          {house.members.map((member) => (
            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="sm:w-40 text-sm font-medium text-gray-700">
                {member.user_name}
                {member.is_admin && (
                  <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-gray-500">Rs</span>
                <input
                  type="number"
                  value={memberRents[member.id] || ''}
                  onChange={(e) =>
                    setMemberRents({ ...memberRents, [member.id]: e.target.value })
                  }
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button
                  onClick={() => handleUpdateMemberRent(member.id)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>

        {remaining !== 0 && (
          <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
            Warning: Assigned rent does not match total rent. Remaining: {formatRs(Math.abs(remaining))}
          </div>
        )}
      </div>

      {/* Meal Days */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Meal Days (Food Sharing)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select which days each member eats at the house. Sunday counts as <b>2x</b> (special meal).
          Food expense is shared based on total meal-units each member consumes.
        </p>

        <div className="space-y-4">
          {house.members.map((member) => (
            <div key={`md-${member.id}`} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">
                  {member.user_name}
                </div>
                <button
                  onClick={() => handleSaveMealDays(member.id)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
                >
                  Save
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((d) => {
                  const active = memberMealDays[member.id]?.has(d.num);
                  return (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => toggleMealDay(member.id, d.num)}
                      className={`px-1 sm:px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border transition-colors ${
                        active
                          ? d.num === 6
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      {d.label}{d.num === 6 && active ? '×2' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
