import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRs, formatDate } from '../utils/formatCurrency';

const CATEGORIES = [
  'Food', 'House Cleaning', 'Electricity', 'Gas',
  'Water', 'Internet', 'Maintenance', 'Other'
];

export default function Expenses() {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Filter state
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isShared, setIsShared] = useState(true);
  const [forUserId, setForUserId] = useState('');

  useEffect(() => {
    fetchHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) fetchExpenses();
  }, [selectedHouse, filterMonth, filterYear, filterCategory]);

  const fetchHouses = async () => {
    try {
      const res = await api.get('/houses/my-houses');
      setHouses(res.data);
      if (res.data.length > 0) {
        setSelectedHouse(res.data[0].id);
        setMembers(res.data[0].members || []);
      }
    } catch (err) {
      setError('Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHouse) {
      const h = houses.find((x) => x.id === selectedHouse);
      setMembers(h?.members || []);
      if (user && h?.members?.some((m) => m.user_id === user.id)) {
        setForUserId(user.id.toString());
      }
    }
  }, [selectedHouse, houses, user]);

  const fetchExpenses = async () => {
    try {
      let url = `/expenses/?house_id=${selectedHouse}&month=${filterMonth}&year=${filterYear}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      const res = await api.get(url);
      setExpenses(res.data);
    } catch (err) {
      setError('Failed to load expenses');
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategory('Food');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsShared(true);
    setForUserId(user?.id?.toString() || '');
    setEditingId(null);
    setShowForm(false);
  };

  const isOutsideFood = !isShared && category === 'Food';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, {
          amount: parseFloat(amount),
          category,
          description: description || null,
          date,
          is_shared: isShared,
        });
      } else {
        const payload = {
          house_id: selectedHouse,
          amount: parseFloat(amount),
          category,
          description: description || null,
          date,
          is_shared: isShared,
        };
        // For outside food (personal + Food), allow tagging the consumer
        if (isOutsideFood && forUserId) {
          payload.user_id = parseInt(forUserId);
        }
        await api.post('/expenses/', payload);
      }
      resetForm();
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save expense');
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setDescription(expense.description || '');
    setDate(expense.date);
    setIsShared(expense.is_shared);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (houses.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">You need to join or create a house first.</p>
        <a href="/house" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Set up a house
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense type
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="sharedType"
                    checked={isShared}
                    onChange={() => setIsShared(true)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>
                    <b>Shared</b> (house-level) &mdash;{' '}
                    {category === 'Food'
                      ? 'split among members based on meal days (Sun = 2x)'
                      : 'split equally among all members'}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="sharedType"
                    checked={!isShared}
                    onChange={() => setIsShared(false)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>
                    <b>Personal</b>
                    {category === 'Food'
                      ? ' (outside food / takeaway — only the person pays)'
                      : ' (only you pay, not split)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Outside Food: Who ate it? (only when Personal + Food and creating new) */}
            {isOutsideFood && !editingId && (
              <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <label className="block text-sm font-medium text-orange-900 mb-1">
                  🍔 Who ate this outside food?
                </label>
                <p className="text-xs text-orange-700 mb-2">
                  Tag the person who ate it — the expense will be logged under them.
                </p>
                <select
                  value={forUserId}
                  onChange={(e) => setForUserId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-orange-300 bg-white rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                >
                  <option value="">Select member...</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_name}{m.user_id === user?.id ? ' (You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {editingId ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-4 sm:items-end">
          <div>
            <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-3 sm:col-span-1 sm:ml-auto text-right border-t sm:border-0 pt-2 sm:pt-0">
            <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
            <div className="text-base sm:text-lg font-bold text-gray-900">{formatRs(totalExpenses)}</div>
          </div>
        </div>
      </div>

      {/* Expenses: Mobile cards */}
      <div className="md:hidden space-y-2">
        {expenses.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-center text-gray-400 text-sm">
            No expenses for this period
          </div>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="bg-white rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {exp.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      exp.is_shared ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {exp.is_shared ? 'Shared' : 'Personal'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1 truncate">
                    {exp.description || <span className="text-gray-400 italic">No description</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {exp.user_name} · {formatDate(exp.date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-gray-900">{formatRs(exp.amount)}</div>
                  <div className="flex gap-2 mt-1 justify-end">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="text-indigo-600 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Expenses: Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shared</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                  No expenses for this period
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.user_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{exp.description || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {formatRs(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      exp.is_shared ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {exp.is_shared ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
