import { useState, useEffect } from 'react';
import api from '../api/client';
import { formatRs } from '../utils/formatCurrency';

export default function Reports() {
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewData, setViewData] = useState(null);

  const now = new Date();
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) fetchReports();
  }, [selectedHouse]);

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

  const fetchReports = async () => {
    try {
      const res = await api.get(`/reports/${selectedHouse}`);
      setReports(res.data);
    } catch {
      setError('Failed to load reports');
    }
  };

  const handleGenerate = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/reports/${selectedHouse}/generate`, {
        month: genMonth,
        year: genYear,
      });
      setSuccess('Report generated');
      setViewData(res.data.data);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report');
    }
  };

  const handleSendEmail = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/reports/${selectedHouse}/send`, {
        month: genMonth,
        year: genYear,
      });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setSuccess(`Emails sent to: ${res.data.sent.join(', ') || 'none'}` +
          (res.data.failed.length ? ` | Failed: ${res.data.failed.map(f => f.email).join(', ')}` : ''));
      }
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send emails');
    }
  };

  const handleViewReport = async (year, month) => {
    try {
      const res = await api.get(`/reports/${selectedHouse}/${year}/${month}`);
      setViewData(res.data.data);
      setGenMonth(month);
      setGenYear(year);
    } catch {
      setError('Failed to load report');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (houses.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Join or create a house first.</p>
      </div>
    );
  }

  const monthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Monthly Reports</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Generate Controls */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Generate Report</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 sm:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
            <select
              value={genMonth}
              onChange={(e) => setGenMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select
              value={genYear}
              onChange={(e) => setGenYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            className="col-span-1 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-medium"
          >
            Generate
          </button>
          <button
            onClick={handleSendEmail}
            className="col-span-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium"
          >
            Send Email
          </button>
        </div>
      </div>

      {/* Report View */}
      {viewData && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6" id="report-view">
          <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900 min-w-0 flex-1 break-words">
              {viewData.house_name}<br className="sm:hidden" />
              <span className="hidden sm:inline"> - </span>
              <span className="text-xs sm:text-lg font-normal text-gray-600 sm:text-gray-900">{monthName(viewData.month)} {viewData.year}</span>
            </h2>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 text-xs sm:text-sm text-gray-600 border rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Print
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gray-50 p-2 sm:p-4 rounded-lg text-center">
              <div className="text-[10px] sm:text-sm text-gray-500">Total Rent</div>
              <div className="text-xs sm:text-lg font-bold">{formatRs(viewData.total_monthly_rent)}</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-4 rounded-lg text-center">
              <div className="text-[10px] sm:text-sm text-gray-500">Shared Exp</div>
              <div className="text-xs sm:text-lg font-bold">{formatRs(viewData.total_shared_expenses)}</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-4 rounded-lg text-center">
              <div className="text-[10px] sm:text-sm text-gray-500">Members</div>
              <div className="text-xs sm:text-lg font-bold">{viewData.member_count}</div>
            </div>
          </div>

          {/* Two-list Summary: Amount Spent + Balance Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Amount Spent */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
                Amount Spent by each person
              </h3>
              <ul className="space-y-1.5">
                {viewData.members.map((m) => (
                  <li key={`s-${m.user_id}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{m.name}</span>
                    <span className="font-medium tabular-nums">{formatRs(m.shared_spending)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm pt-2 border-t mt-2 font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="tabular-nums">{formatRs(viewData.total_shared_expenses)}</span>
                </li>
              </ul>
            </div>
            {/* Balance Payment */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
                Balance Payment <span className="text-xs text-gray-400 font-normal">(rent + share − spent)</span>
              </h3>
              <ul className="space-y-1.5">
                {viewData.members.map((m) => {
                  const share = m.shared_fair_share ?? viewData.shared_expense_per_person ?? 0;
                  const bp = m.custom_rent + share - m.shared_spending;
                  const isNeg = bp < 0;
                  return (
                    <li key={`b-${m.user_id}`} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">{m.name}</span>
                      <span className={`font-semibold tabular-nums ${isNeg ? 'text-green-600' : 'text-gray-900'}`}>
                        {isNeg ? `(${formatRs(Math.abs(bp))})` : formatRs(bp)}
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between text-sm pt-2 border-t mt-2 font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="tabular-nums text-indigo-700">{formatRs(viewData.total_monthly_rent)}</span>
                </li>
              </ul>
              <p className="text-[10px] text-gray-500 mt-2">
                Negative = overpaid (gets back). Total = total rent.
              </p>
            </div>
          </div>

          {/* Detailed breakdown table (desktop) */}
          <div className="hidden md:block overflow-x-auto mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Full Breakdown</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Member</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rent</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Share</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Spent</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Balance Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewData.members.map((m) => {
                  const share = m.shared_fair_share ?? viewData.shared_expense_per_person ?? 0;
                  const bp = m.custom_rent + share - m.shared_spending;
                  const isNeg = bp < 0;
                  return (
                    <tr key={m.user_id}>
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRs(m.custom_rent)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRs(share)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRs(m.shared_spending)}</td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${isNeg ? 'text-green-600' : 'text-gray-900'}`}>
                        {isNeg ? `(${formatRs(Math.abs(bp))})` : formatRs(bp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Reports */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Past Reports</h2>
        {reports.length === 0 ? (
          <p className="text-gray-400 text-sm">No reports generated yet</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {monthName(r.month)} {r.year}
                  </span>
                  {r.sent_at && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Emailed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleViewReport(r.year, r.month)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
