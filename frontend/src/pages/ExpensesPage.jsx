/**
 * ExpensesPage.jsx — Add, edit, delete expenses with category filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { expenseAPI } from '../services/api';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'rent', label: 'Rent & Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'health', label: 'Health & Fitness' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'education', label: 'Education' },
  { value: 'savings', label: 'Savings Transfer' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = { title: '', category: 'other', amount: '', date: '', notes: '' };

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        params.year = year;
        params.month = month;
      }
      const [listRes, totalRes] = await Promise.all([
        expenseAPI.list(params),
        expenseAPI.monthlyTotal(),
      ]);
      setExpenses(listRes.data.results || listRes.data);
      setMonthlyTotal(totalRes.data);
    } catch {
      toast.error('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, date: format(new Date(), 'yyyy-MM-dd') });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ title: item.title, category: item.category, amount: item.amount, date: item.date, notes: item.notes || '' });
    setErrors({});
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.category) errs.category = 'Select a category.';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount.';
    if (!form.date) errs.date = 'Date is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editItem) {
        await expenseAPI.update(editItem.id, form);
        toast.success('Expense updated.');
      } else {
        await expenseAPI.create(form);
        toast.success('Expense added.');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const mapped = {};
        Object.keys(data).forEach((k) => { mapped[k] = Array.isArray(data[k]) ? data[k][0] : data[k]; });
        setErrors(mapped);
      } else {
        toast.error('Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expenseAPI.delete(id);
      toast.success('Expense deleted.');
      loadData();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const totalAll = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Monitor and categorize your spending</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Expense
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="summary-chip">This month <strong className="text-expense" style={{ marginLeft: 6 }}>{fmt(monthlyTotal?.total)}</strong></div>
        <div className="summary-chip">Shown <strong style={{ marginLeft: 6 }}>{fmt(totalAll)}</strong></div>
        <div className="summary-chip">{expenses.length} entries</div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          type="month" className="form-input"
          value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
        />
        {(filterCategory || filterMonth) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterCategory(''); setFilterMonth(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{ height: '30vh' }}><div className="spinner" /></div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">↓</div>
          <h3>No expenses found</h3>
          <p>Add your first expense or adjust your filters.</p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Add Expense</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td className="td-primary">{item.title}</td>
                  <td>
                    <span className={`badge badge-${item.category}`}>
                      {item.category_display || item.category}
                    </span>
                  </td>
                  <td>{format(new Date(item.date), 'MMM d, yyyy')}</td>
                  <td className="td-amount-expense">−{fmt(item.amount)}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.notes || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}>✎</button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(item.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Expense' : 'Add Expense'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editItem ? 'Save Changes' : 'Add Expense'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              name="title" type="text" className="form-input"
              placeholder="e.g. Grocery run, Rent payment"
              value={form.title} onChange={handleChange} autoFocus
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="category" className="form-select" value={form.category} onChange={handleChange}>
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className="form-error">{errors.category}</p>}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Amount ($)</label>
              <input
                name="amount" type="number" min="0.01" step="0.01"
                className="form-input" placeholder="0.00"
                value={form.amount} onChange={handleChange}
              />
              {errors.amount && <p className="form-error">{errors.amount}</p>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input
                name="date" type="date" className="form-input"
                value={form.date} onChange={handleChange}
              />
              {errors.date && <p className="form-error">{errors.date}</p>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Notes (optional)</label>
            <input
              name="notes" type="text" className="form-input"
              placeholder="Any notes…" value={form.notes} onChange={handleChange}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
