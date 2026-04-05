import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRs, formatDate } from '../utils/formatCurrency';

export default function Rent() {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [dashSummary, setDashSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [forUserId, setForUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => { fetchHouses(); }, []);
  useEffect(() => {
    if (selectedHouse) {
      fetchSummary();
      fetchPayments();
      fetchDashSummary();
      const h = houses.find((x) => x.id === selectedHouse);
      setMembers(h?.members || []);
      if (user && h?.members?.some((m) => m.user_id === user.id)) {
        setForUserId(user.id.toString());
      }
    }
  }, [selectedHouse, month, year, houses, user]);

  const fetchHouses = async () => {
    try {
      const res = await api.get('/houses/my-houses');
      setHouses(res.data);
      if (res.data.length > 0) setSelectedHouse(res.data[0].id);
    } catch {
      setError('Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/rent-payments/${selectedHouse}/summary/${year}/${month}`);
      setSummary(res.data);
    } catch {
      setError('Failed to load summary');
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get(`/rent-payments/?house_id=${selectedHouse}&month=${month}&year=${year}`);
      setPayments(res.data);
    } catch {
      setError('Failed to load payments');
    }
  };

  const fetchDashSummary = async () => {
    try {
      const res = await api.get(`/dashboard/${selectedHouse}/summary?month=${month}&year=${year}`);
      setDashSummary(res.data);
    } catch {
      setDashSummary(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/rent-payments/', {
        house_id: selectedHouse,
        user_id: parseInt(forUserId),
        month,
        year,
        amount: parseFloat(amount),
        paid_on: paidOn,
        note: note || null,
      });
      setSuccess('Payment recorded');
      setAmount('');
      setNote('');
      setShowForm(false);
      fetchSummary();
      fetchPayments();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/rent-payments/${id}`);
      fetchSummary();
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Prefill amount with remaining balance when user changes
  useEffect(() => {
    if (forUserId && summary) {
      const row = summary.members.find((m) => m.user_id === parseInt(forUserId));
      if (row && row.balance > 0) setAmount(row.balance.toString());
    }
  }, [forUserId, summary]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (houses.length === 0) {
    return <div className="p-8 text-center text-gray-500">Join or create a house first.</div>;
  }

  const statusBadge = (status) => {
    const map = {
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-amber-100 text-amber-700',
      unpaid: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rent Payments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm"
        >
          {showForm ? 'Cancel' : '+ Record Payment'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4 bg-white rounded-lg border py-2">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-lg">&larr;</button>
        <span className="text-base sm:text-lg font-semibold text-gray-900 min-w-[140px] text-center">
          Rent for {monthName} {year}
        </span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-lg">&rarr;</button>
      </div>

      {/* Due Date Banner — rent for [month] is due on [due_day] of NEXT month */}
      {(() => {
        const house = houses.find((h) => h.id === selectedHouse);
        const dueDay = house?.rent_due_day || 1;
        // Rent for the selected month is due on due_day of the FOLLOWING month
        const dueMonth = month === 12 ? 1 : month + 1;
        const dueYear = month === 12 ? year + 1 : year;
        const dueDate = new Date(dueYear, dueMonth - 1, dueDay);
        const dueMonthName = new Date(dueYear, dueMonth - 1).toLocaleString('default', { month: 'long' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const isPastDue = daysUntilDue < 0;
        const isSoon = daysUntilDue >= 0 && daysUntilDue <= 3;
        const bannerClass = isPastDue
          ? 'bg-red-50 border-red-200 text-red-800'
          : isSoon
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800';
        const suffix = (d) => {
          if ([11, 12, 13].includes(d)) return 'th';
          const last = d % 10;
          return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
        };
        return (
          <div className={`border rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 ${bannerClass}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <div>
                  <div className="text-xs uppercase font-semibold tracking-wide opacity-80">Rent Due Date</div>
                  <div className="text-sm sm:text-base font-bold">
                    {dueDay}{suffix(dueDay)} {dueMonthName} {dueYear}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">for {monthName} {year}</div>
                </div>
              </div>
              <div className="text-xs sm:text-sm font-medium">
                {isPastDue
                  ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} past due`
                  : daysUntilDue === 0
                    ? 'Due today!'
                    : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Payment Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Record Rent Payment</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Who paid?</label>
              <select
                value={forUserId}
                onChange={(e) => setForUserId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}{m.user_id === user?.id ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs)</label>
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                required min="0.01" step="0.01" inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Paid On</label>
              <input
                type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. UPI, cash, bank transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-5">
            <div className="text-[10px] sm:text-sm text-gray-500 uppercase">Total Due</div>
            <div className="text-base sm:text-xl font-bold text-gray-900 mt-1">{formatRs(summary.total_due)}</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3 sm:p-5">
            <div className="text-[10px] sm:text-sm text-green-700 uppercase">Collected</div>
            <div className="text-base sm:text-xl font-bold text-green-900 mt-1">{formatRs(summary.total_paid)}</div>
          </div>
          <div className={`rounded-xl border p-3 sm:p-5 ${summary.total_pending > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`text-[10px] sm:text-sm uppercase ${summary.total_pending > 0 ? 'text-red-700' : 'text-gray-700'}`}>Pending</div>
            <div className={`text-base sm:text-xl font-bold mt-1 ${summary.total_pending > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              {formatRs(summary.total_pending)}
            </div>
          </div>
        </div>
      )}

      {/* Owner Payout Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs text-indigo-700 uppercase tracking-wide font-semibold">💰 To Pay Owner</div>
              <div className="text-xs text-indigo-600 mt-0.5">
                Total collected from members (ready for landlord)
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-indigo-900">{formatRs(summary.total_paid)}</div>
              {summary.total_pending > 0 && (
                <div className="text-xs text-red-600 mt-0.5">
                  ({formatRs(summary.total_pending)} still to collect)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Per-member breakdown — Balance Payment based */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Member Status</h2>
          <div className="space-y-2">
            {summary.members.map((m) => {
              // Balance Payment = custom_rent + shared_fair_share − shared_spending
              const dashMember = dashSummary?.members?.find((dm) => dm.user_id === m.user_id);
              const balancePayment = dashMember
                ? dashMember.custom_rent + (dashMember.shared_fair_share || 0) - dashMember.shared_spending
                : m.rent_due;
              const effectiveDue = Math.max(balancePayment, 0);
              const paid = m.rent_paid;
              const remaining = Math.max(effectiveDue - paid, 0);
              const progress = effectiveDue > 0 ? Math.min(100, (paid / effectiveDue) * 100) : 100;
              const status = balancePayment < 0
                ? 'credit'
                : remaining <= 0.01
                  ? 'paid'
                  : paid > 0.01
                    ? 'partial'
                    : 'unpaid';
              const statusClass = {
                paid: 'bg-green-100 text-green-700',
                partial: 'bg-amber-100 text-amber-700',
                unpaid: 'bg-red-100 text-red-700',
                credit: 'bg-blue-100 text-blue-700',
              }[status];
              const barClass = status === 'paid' ? 'bg-green-500' : status === 'partial' ? 'bg-amber-500' : status === 'credit' ? 'bg-blue-500' : 'bg-red-400';

              return (
                <div key={m.user_id} className={`border rounded-lg p-3 ${m.user_id === user?.id ? 'border-indigo-300 ring-1 ring-indigo-100' : ''}`}>
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
                      <div className="text-sm font-bold text-gray-900">
                        {formatRs(paid)}{' '}
                        <span className="text-gray-400">
                          / {balancePayment < 0 ? `(${formatRs(Math.abs(balancePayment))})` : formatRs(effectiveDue)}
                        </span>
                      </div>
                      {balancePayment < 0 ? (
                        <div className="text-xs text-green-600">Gets back: {formatRs(Math.abs(balancePayment))}</div>
                      ) : remaining > 0.01 ? (
                        <div className="text-xs text-red-600">Pending: {formatRs(remaining)}</div>
                      ) : (
                        <div className="text-xs text-green-600">Fully paid</div>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${barClass}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 mt-3">
            Status is based on <b>Balance Payment</b> (rent + shared expense share − amount spent), not the assigned rent.
          </p>
        </div>
      )}

      {/* Monthly Summary — Amount Spent / Balance Payment */}
      {dashSummary && dashSummary.members?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Monthly Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Amount Spent */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
                Amount Spent by each person
              </h3>
              <ul className="space-y-1.5">
                {dashSummary.members.map((m) => (
                  <li key={`spent-${m.user_id}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{m.name}</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {formatRs(m.shared_spending)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm pt-2 border-t mt-2 font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="tabular-nums text-gray-900">
                    {formatRs(dashSummary.total_shared_expenses)}
                  </span>
                </li>
              </ul>
            </div>

            {/* Balance Payment */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
                Balance Payment <span className="text-xs text-gray-400 font-normal">(rent + share − spent)</span>
              </h3>
              <ul className="space-y-1.5">
                {dashSummary.members.map((m) => {
                  const balancePayment = m.custom_rent + (m.shared_fair_share || 0) - m.shared_spending;
                  const isNegative = balancePayment < 0;
                  return (
                    <li key={`bal-${m.user_id}`} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">{m.name}</span>
                      <span className={`font-semibold tabular-nums ${isNegative ? 'text-green-600' : 'text-gray-900'}`}>
                        {isNegative ? `(${formatRs(Math.abs(balancePayment))})` : formatRs(balancePayment)}
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between text-sm pt-2 border-t mt-2 font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="tabular-nums text-indigo-700">
                    {formatRs(dashSummary.total_monthly_rent)}
                  </span>
                </li>
              </ul>
              <p className="text-[10px] text-gray-500 mt-2">
                Negative = they overpaid (get back). Total = total rent.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No payments recorded yet</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{p.user_name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(p.paid_on)}{p.note && ` · ${p.note}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-gray-900">{formatRs(p.amount)}</div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
