/**
 * SavingsPage.jsx — Create and track savings goals with progress bars.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { savingsAPI } from '../services/api';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const EMPTY_FORM = { name: '', target_amount: '', deadline: '' };

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function SavingsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Add funds modal
  const [fundsModal, setFundsModal] = useState(false);
  const [fundsGoal, setFundsGoal] = useState(null);
  const [fundsAmount, setFundsAmount] = useState('');

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await savingsAPI.list();
      setGoals(data.results || data);
    } catch {
      toast.error('Failed to load savings goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, target_amount: item.target_amount, deadline: item.deadline });
    setErrors({});
    setModalOpen(true);
  };

  const openAddFunds = (goal) => {
    setFundsGoal(goal);
    setFundsAmount('');
    setFundsModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Goal name is required.';
    if (!form.target_amount || isNaN(form.target_amount) || Number(form.target_amount) <= 0)
      errs.target_amount = 'Enter a valid target amount.';
    if (!form.deadline) errs.deadline = 'Deadline is required.';
    else if (new Date(form.deadline) <= new Date()) errs.deadline = 'Deadline must be in the future.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editItem) {
        await savingsAPI.update(editItem.id, form);
        toast.success('Goal updated.');
      } else {
        await savingsAPI.create(form);
        toast.success('Savings goal created!');
      }
      setModalOpen(false);
      loadGoals();
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
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await savingsAPI.delete(id);
      toast.success('Goal deleted.');
      loadGoals();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(fundsAmount);
    if (!fundsAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    try {
      await savingsAPI.addFunds(fundsGoal.id, amount);
      toast.success(`${fmt(amount)} added to "${fundsGoal.name}"!`);
      setFundsModal(false);
      loadGoals();
    } catch {
      toast.error('Failed to add funds.');
    }
  };

  const completed = goals.filter((g) => g.progress_percentage >= 100).length;
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Set targets and track your progress</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + New Goal
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="summary-chip">{goals.length} goals</div>
        <div className="summary-chip">Total saved <strong className="text-income" style={{ marginLeft: 6 }}>{fmt(totalSaved)}</strong></div>
        <div className="summary-chip">{completed} completed</div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="flex-center" style={{ height: '30vh' }}><div className="spinner" /></div>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <h3>No savings goals yet</h3>
          <p>Create your first goal and start tracking progress.</p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>Create Goal</button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => {
            const pct = Math.min(goal.progress_percentage, 100);
            const done = pct >= 100;
            const onTrack = goal.is_on_track;

            return (
              <div key={goal.id} className="goal-card">
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontFamily: 'Playfair Display, serif' }}>{goal.name}</h3>
                  <span className={`goal-status ${done ? 'completed' : onTrack ? 'on-track' : 'behind'}`}>
                    {done ? '✓ Completed' : onTrack ? '↑ On track' : '↓ Behind'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${!onTrack && !done ? 'behind' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Amounts */}
                <div className="goal-amounts">
                  <div>
                    <div className="goal-current">{fmt(goal.current_amount)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>saved so far</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="goal-target">{fmt(goal.target_amount)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>target</div>
                  </div>
                </div>

                {/* % label */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                  {Math.round(pct)}% complete
                </div>

                {/* Deadline */}
                <div className="goal-deadline">
                  📅 {format(new Date(goal.deadline), 'MMM d, yyyy')} —{' '}
                  {goal.days_remaining > 0
                    ? `${goal.days_remaining} days remaining`
                    : done
                    ? 'Goal achieved!'
                    : 'Deadline passed'}
                </div>

                {/* Actions */}
                <div className="goal-actions">
                  {!done && (
                    <button className="btn btn-primary btn-sm" onClick={() => openAddFunds(goal)}>
                      + Add Funds
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(goal)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Goal' : 'New Savings Goal'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editItem ? 'Save Changes' : 'Create Goal'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Goal Name</label>
            <input
              name="name" type="text" className="form-input"
              placeholder="e.g. Emergency Fund, Vacation, New Laptop"
              value={form.name} onChange={handleChange} autoFocus
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Amount ($)</label>
              <input
                name="target_amount" type="number" min="0.01" step="0.01"
                className="form-input" placeholder="0.00"
                value={form.target_amount} onChange={handleChange}
              />
              {errors.target_amount && <p className="form-error">{errors.target_amount}</p>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deadline</label>
              <input
                name="deadline" type="date" className="form-input"
                value={form.deadline} onChange={handleChange}
                min={format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')}
              />
              {errors.deadline && <p className="form-error">{errors.deadline}</p>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Funds Modal */}
      <Modal
        isOpen={fundsModal}
        onClose={() => setFundsModal(false)}
        title={`Add Funds — ${fundsGoal?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFundsModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddFunds}>Add Funds</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Amount to Add ($)</label>
          <input
            type="number" min="0.01" step="0.01"
            className="form-input" placeholder="0.00"
            value={fundsAmount} onChange={(e) => setFundsAmount(e.target.value)}
            autoFocus
          />
        </div>
        {fundsGoal && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Current: {fmt(fundsGoal.current_amount)} / {fmt(fundsGoal.target_amount)} ({Math.round(fundsGoal.progress_percentage)}%)
          </p>
        )}
      </Modal>
    </div>
  );
}
