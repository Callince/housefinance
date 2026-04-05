import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../api/client';
import { formatRs } from '../utils/formatCurrency';
import { useAuth } from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [rentSummary, setRentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) fetchSummary();
  }, [selectedHouse, month, year]);

  const fetchHouses = async () => {
    try {
      const res = await api.get('/houses/my-houses');
      setHouses(res.data);
      if (res.data.length > 0) setSelectedHouse(res.data[0].id);
      else setLoading(false);
    } catch {
      setError('Failed to load houses');
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/${selectedHouse}/summary?month=${month}&year=${year}`);
      setSummary(res.data);
      try {
        const rs = await api.get(`/rent-payments/${selectedHouse}/summary/${year}/${month}`);
        setRentSummary(rs.data);
      } catch { setRentSummary(null); }
    } catch {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (houses.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No House Found</h2>
          <p className="text-gray-500 mb-4">Create or join a house to get started</p>
          <button
            onClick={() => navigate('/house')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Set Up House
          </button>
        </div>
      </div>
    );
  }

  const myData = summary?.members?.find((m) => m.user_id === user?.id);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Chart data
  const categoryData = summary ? {
    labels: Object.keys(summary.category_totals),
    datasets: [{
      data: Object.values(summary.category_totals),
      backgroundColor: COLORS.slice(0, Object.keys(summary.category_totals).length),
    }],
  } : null;

  const memberData = summary ? {
    labels: summary.members.map((m) => m.name),
    datasets: [
      {
        label: 'Shared Spending',
        data: summary.members.map((m) => m.shared_spending),
        backgroundColor: '#6366f1',
      },
      {
        label: 'Personal Spending',
        data: summary.members.map((m) => m.personal_spending),
        backgroundColor: '#e5e7eb',
      },
    ],
  } : null;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-brand-gradient p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden shadow-brand">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-emerald-50/90 font-medium uppercase tracking-wider mb-1">
              {monthName} {year}
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-white truncate">
              {summary?.house_name || 'Dashboard'}
            </h1>
            {houses.length > 1 && (
              <select
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(parseInt(e.target.value))}
                className="mt-2 text-xs bg-white/20 backdrop-blur text-white border border-white/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {houses.map((h) => <option key={h.id} value={h.id} className="text-slate-900">{h.name}</option>)}
              </select>
            )}
          </div>
          <button
            onClick={() => navigate(`/house/${selectedHouse}/settings`)}
            className="px-3 py-2 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 text-xs sm:text-sm font-medium whitespace-nowrap border border-white/30 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 bg-white rounded-2xl border border-slate-100 shadow-card p-1.5">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm sm:text-base font-semibold text-slate-900 text-center flex-1">{monthName} {year}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3 sm:p-5">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                Total Rent
              </div>
              <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">{formatRs(summary.total_monthly_rent)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3 sm:p-5">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                <svg className="w-3.5 h-3.5 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                Shared
              </div>
              <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">{formatRs(summary.total_shared_expenses)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3 sm:p-5">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                <svg className="w-3.5 h-3.5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Your Rent
              </div>
              <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">{formatRs(myData?.custom_rent || 0)}</div>
            </div>
            <div className={`rounded-2xl border p-3 sm:p-5 ${
              (myData?.expense_balance || 0) >= 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1.5 ${
                (myData?.expense_balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {(myData?.expense_balance || 0) >= 0 ? '↗' : '↘'} Your Balance
              </div>
              <div className={`text-base sm:text-2xl font-bold tracking-tight ${
                (myData?.expense_balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {(myData?.expense_balance || 0) >= 0 ? '+' : ''}{formatRs(myData?.expense_balance || 0)}
              </div>
              <div className={`text-[10px] sm:text-xs mt-0.5 ${
                (myData?.expense_balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {(myData?.expense_balance || 0) >= 0 ? 'Others owe you' : 'You owe others'}
              </div>
            </div>
          </div>

          {/* Rent Payment Status */}
          {rentSummary && (
            <div
              onClick={() => navigate('/rent')}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3 sm:p-5 mb-4 sm:mb-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-indigo-900 uppercase tracking-wide">🏠 Rent Collection</h3>
                  <p className="text-[10px] sm:text-xs text-indigo-700 mt-0.5">
                    {rentSummary.total_pending > 0
                      ? `${formatRs(rentSummary.total_pending)} still to collect before paying owner`
                      : 'All rent collected — ready for owner'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-6 text-xs sm:text-sm w-full sm:w-auto">
                  <div>
                    <div className="text-[10px] sm:text-xs text-indigo-700">Due</div>
                    <div className="font-bold text-indigo-900">{formatRs(rentSummary.total_due)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-green-700">Paid</div>
                    <div className="font-bold text-green-900">{formatRs(rentSummary.total_paid)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-red-700">Pending</div>
                    <div className="font-bold text-red-900">{formatRs(rentSummary.total_pending)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rent Payment Summary */}
          {rentSummary && (
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  💰 Rent Payments — {monthName}
                </h2>
                <button
                  onClick={() => navigate('/rent')}
                  className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Manage →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase">Due</div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900">{formatRs(rentSummary.total_due)}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-[10px] sm:text-xs text-green-700 uppercase">Collected</div>
                  <div className="text-sm sm:text-lg font-bold text-green-900">{formatRs(rentSummary.total_paid)}</div>
                </div>
                <div className={`rounded-lg p-2 sm:p-3 text-center border ${rentSummary.total_pending > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[10px] sm:text-xs uppercase ${rentSummary.total_pending > 0 ? 'text-red-700' : 'text-gray-700'}`}>Pending</div>
                  <div className={`text-sm sm:text-lg font-bold ${rentSummary.total_pending > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                    {formatRs(rentSummary.total_pending)}
                  </div>
                </div>
              </div>
              {/* Per-member compact status */}
              <div className="space-y-1.5">
                {rentSummary.members.map((m) => {
                  const dm = summary.members.find((x) => x.user_id === m.user_id);
                  const balancePayment = dm
                    ? dm.custom_rent + (dm.shared_fair_share || 0) - dm.shared_spending
                    : m.rent_due;
                  const effectiveDue = Math.max(balancePayment, 0);
                  const paid = m.rent_paid;
                  const remaining = Math.max(effectiveDue - paid, 0);
                  const isCredit = balancePayment < 0;
                  const status = isCredit ? 'credit' : remaining <= 0.01 ? 'paid' : paid > 0.01 ? 'partial' : 'unpaid';
                  const dotColor = {
                    paid: 'bg-green-500',
                    partial: 'bg-amber-500',
                    unpaid: 'bg-red-400',
                    credit: 'bg-blue-500',
                  }[status];
                  return (
                    <div key={`rent-${m.user_id}`} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                        <span className="text-gray-900 truncate">
                          {m.name}{m.user_id === user?.id && <span className="text-indigo-600 text-xs ml-1">(You)</span>}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-gray-900 tabular-nums">
                          {formatRs(paid)}
                        </span>
                        <span className="text-gray-400 tabular-nums">
                          {' / '}
                          {isCredit ? `(${formatRs(Math.abs(balancePayment))})` : formatRs(effectiveDue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Food Sharing Info */}
          {summary.total_shared_food > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-3 sm:p-5 mb-4 sm:mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-orange-900 uppercase tracking-wide">🍽️ Food Sharing</h3>
                  <p className="text-[10px] sm:text-xs text-orange-700 mt-0.5">
                    Split by meal-units. Sunday = 2x.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-6 text-xs sm:text-sm w-full sm:w-auto">
                  <div>
                    <div className="text-[10px] sm:text-xs text-orange-700">Total Food</div>
                    <div className="font-bold text-orange-900">{formatRs(summary.total_shared_food)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-orange-700">Meal Units</div>
                    <div className="font-bold text-orange-900">{summary.total_meal_units}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-orange-700">Per Unit</div>
                    <div className="font-bold text-orange-900">{formatRs(summary.food_per_unit)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Breakdown — based on rent payments */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 px-1">Member Breakdown</h2>

            {/* Mobile: Card view */}
            <div className="md:hidden space-y-2">
              {summary.members.map((m) => {
                const balancePayment = m.custom_rent + (m.shared_fair_share || 0) - m.shared_spending;
                const isCredit = balancePayment < 0;
                const effectiveDue = Math.max(balancePayment, 0);
                const rentMember = rentSummary?.members?.find((rm) => rm.user_id === m.user_id);
                const paid = rentMember?.rent_paid || 0;
                const remaining = Math.max(effectiveDue - paid, 0);
                const status = isCredit ? 'credit' : remaining <= 0.01 ? 'paid' : paid > 0.01 ? 'partial' : 'unpaid';
                const statusClass = {
                  paid: 'bg-green-100 text-green-700',
                  partial: 'bg-amber-100 text-amber-700',
                  unpaid: 'bg-red-100 text-red-700',
                  credit: 'bg-blue-100 text-blue-700',
                }[status];
                const progress = effectiveDue > 0 ? Math.min(100, (paid / effectiveDue) * 100) : 100;
                const barClass = status === 'paid' ? 'bg-green-500' : status === 'partial' ? 'bg-amber-500' : status === 'credit' ? 'bg-blue-500' : 'bg-red-400';

                return (
                  <div
                    key={m.user_id}
                    className={`bg-white rounded-xl border p-3 ${m.user_id === user?.id ? 'border-indigo-300 ring-2 ring-indigo-100' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {m.name}{m.user_id === user?.id && <span className="text-indigo-600 text-xs ml-1">(You)</span>}
                        </span>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${statusClass}`}>
                          {status}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900 tabular-nums">
                          {formatRs(paid)}
                          <span className="text-gray-400"> / {isCredit ? `(${formatRs(Math.abs(balancePayment))})` : formatRs(effectiveDue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className={`h-full transition-all ${barClass}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="bg-gray-50 rounded px-1.5 py-1">
                        <div className="text-gray-500">Rent</div>
                        <div className="font-semibold text-gray-900">{formatRs(m.custom_rent)}</div>
                      </div>
                      <div className="bg-gray-50 rounded px-1.5 py-1">
                        <div className="text-gray-500">Spent</div>
                        <div className="font-semibold text-gray-900">{formatRs(m.shared_spending)}</div>
                      </div>
                      <div className="bg-gray-50 rounded px-1.5 py-1">
                        <div className="text-gray-500">Share</div>
                        <div className="font-semibold text-gray-900">{formatRs(m.shared_fair_share || 0)}</div>
                      </div>
                    </div>
                    {isCredit ? (
                      <div className="text-[10px] text-green-600 mt-1.5">Overpaid — gets back {formatRs(Math.abs(balancePayment))}</div>
                    ) : remaining > 0.01 ? (
                      <div className="text-[10px] text-red-600 mt-1.5">Pending: {formatRs(remaining)}</div>
                    ) : (
                      <div className="text-[10px] text-green-600 mt-1.5">Fully paid</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table view */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rent</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Share</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.members.map((m) => {
                      const balancePayment = m.custom_rent + (m.shared_fair_share || 0) - m.shared_spending;
                      const isCredit = balancePayment < 0;
                      const effectiveDue = Math.max(balancePayment, 0);
                      const rentMember = rentSummary?.members?.find((rm) => rm.user_id === m.user_id);
                      const paid = rentMember?.rent_paid || 0;
                      const remaining = Math.max(effectiveDue - paid, 0);
                      const status = isCredit ? 'credit' : remaining <= 0.01 ? 'paid' : paid > 0.01 ? 'partial' : 'unpaid';
                      const statusClass = {
                        paid: 'bg-green-100 text-green-700',
                        partial: 'bg-amber-100 text-amber-700',
                        unpaid: 'bg-red-100 text-red-700',
                        credit: 'bg-blue-100 text-blue-700',
                      }[status];

                      return (
                        <tr key={m.user_id} className={m.user_id === user?.id ? 'bg-indigo-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {m.name} {m.user_id === user?.id && <span className="text-indigo-600">(You)</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">{formatRs(m.custom_rent)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">{formatRs(m.shared_spending)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">{formatRs(m.shared_fair_share || 0)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 tabular-nums">
                            {isCredit ? `(${formatRs(Math.abs(balancePayment))})` : formatRs(effectiveDue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">{formatRs(paid)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-bold tabular-nums ${
                            isCredit ? 'text-blue-600' : remaining > 0.01 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isCredit ? '+' + formatRs(Math.abs(balancePayment)) : formatRs(remaining)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${statusClass}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {categoryData && Object.keys(summary.category_totals).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">By Category</h2>
                <div className="max-w-[200px] sm:max-w-xs mx-auto">
                  <Pie data={categoryData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
                </div>
              </div>
            )}
            {memberData && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">By Member</h2>
                <Bar
                  data={memberData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: { x: { stacked: true, ticks: { font: { size: 10 } } }, y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } } },
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
