/**
 * IncomePage.jsx — Add, edit, delete income entries with monthly total.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { incomeAPI } from '../services/api';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EMPTY_FORM = { source: '', amount: '', date: '', notes: '' };

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function IncomePage() {
  const [incomes, setIncomes] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Filters
  const [filterSource, setFilterSource] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSource) params.source = filterSource;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        params.year = year;
        params.month = month;
      }
      const [listRes, totalRes] = await Promise.all([
        incomeAPI.list(params),
        incomeAPI.monthlyTotal(),
      ]);
      setIncomes(listRes.data.results || listRes.data);
      setMonthlyTotal(totalRes.data);
    } catch (e) {
      toast.error('Failed to load income data.');
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, date: format(new Date(), 'yyyy-MM-dd') });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ source: item.source, amount: item.amount, date: item.date, notes: item.notes || '' });
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
    if (!form.source.trim()) errs.source = 'Source is required.';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) errs.amount = 'Enter a valid positive amount.';
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
        await incomeAPI.update(editItem.id, form);
        toast.success('Income updated.');
      } else {
        await incomeAPI.create(form);
        toast.success('Income added.');
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
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await incomeAPI.delete(id);
      toast.success('Income deleted.');
      loadData();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const totalAll = incomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Track all your income sources</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Income
        </button>
      </div>

      {/* Summary Chips */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="summary-chip">
          This month <strong className="text-income" style={{ marginLeft: 6 }}>{fmt(monthlyTotal?.total)}</strong>
        </div>
        <div className="summary-chip">
          Shown <strong style={{ marginLeft: 6 }}>{fmt(totalAll)}</strong>
        </div>
        <div className="summary-chip">
          {incomes.length} entries
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Filter by source…"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        />
        <input
          type="month"
          className="form-input"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        />
        {(filterSource || filterMonth) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterSource(''); setFilterMonth(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{ height: '30vh' }}><div className="spinner" /></div>
      ) : incomes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">↑</div>
          <h3>No income entries yet</h3>
          <p>Add your first income source to get started.</p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Add Income</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((item) => (
                <tr key={item.id}>
                  <td className="td-primary">{item.source}</td>
                  <td>{format(new Date(item.date), 'MMM d, yyyy')}</td>
                  <td className="td-amount-income">+{fmt(item.amount)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.notes || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="Edit">✎</button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(item.id)} title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Income' : 'Add Income'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editItem ? 'Save Changes' : 'Add Income'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Source</label>
            <input
              name="source" type="text" className="form-input"
              placeholder="e.g. Salary, Freelance, Dividend"
              value={form.source} onChange={handleChange} autoFocus
            />
            {errors.source && <p className="form-error">{errors.source}</p>}
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
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.date && <p className="form-error">{errors.date}</p>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Notes (optional)</label>
            <input
              name="notes" type="text" className="form-input"
              placeholder="Any additional notes…"
              value={form.notes} onChange={handleChange}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
