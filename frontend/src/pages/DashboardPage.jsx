/**
 * DashboardPage.jsx — Main overview with stat cards, pie chart, and bar chart.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

// Category colors for pie chart
const CATEGORY_COLORS = {
  food: '#c9a96e',
  rent: '#7ba7bc',
  utilities: '#b48cc8',
  travel: '#64b4a0',
  entertainment: '#e07a5f',
  health: '#8ba878',
  shopping: '#d2a064',
  education: '#a0b4dc',
  savings: '#6da870',
  other: '#8a8fa0',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem',
    }}>
      {label && <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          <strong>{entry.name}:</strong> {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem',
    }}>
      <p style={{ color: 'var(--text-primary)' }}><strong>{name}</strong></p>
      <p style={{ color: 'var(--accent-green)' }}>{fmt(value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: summary } = await dashboardAPI.getSummary();
        setData(summary);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const pieData = (data?.expenses_by_category || []).map((c) => ({
    name: c.name,
    value: c.value,
    category: c.category,
  }));

  const statsCards = [
    {
      label: 'Total Income',
      value: fmt(data?.total_income),
      icon: '↑',
      color: 'var(--accent-green)',
      bg: 'var(--accent-green-dim)',
      change: `${fmt(data?.month_income)} this month`,
    },
    {
      label: 'Total Expenses',
      value: fmt(data?.total_expenses),
      icon: '↓',
      color: 'var(--accent-red)',
      bg: 'var(--accent-red-dim)',
      change: `${fmt(data?.month_expenses)} this month`,
    },
    {
      label: 'Net Balance',
      value: fmt(data?.balance),
      icon: '◎',
      color: data?.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
      bg: data?.balance >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
      change: data?.balance >= 0 ? 'Positive balance' : 'Overspent',
    },
    {
      label: 'Active Goals',
      value: (data?.savings_summary || []).length,
      icon: '◈',
      color: 'var(--accent-gold)',
      bg: 'var(--accent-gold-dim)',
      change: `${(data?.savings_summary || []).filter((g) => g.progress_percentage >= 100).length} completed`,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>
          </p>
        </div>
        <span className="summary-chip">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="dashboard-grid">
        {/* Stat Cards */}
        <div className="stats-row">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="stat-card"
              style={{ '--stat-color': card.color, '--stat-bg': card.bg }}
            >
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-change">{card.change}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          {/* Bar Chart — Monthly Income vs Expenses */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Overview</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.monthly_data || []} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} />
                <Bar dataKey="income" name="Income" fill="var(--accent-green)" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--accent-red)" radius={[4, 4, 0, 0]} opacity={0.75} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart — Expenses by Category */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Spending by Category</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All time</span>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category] || '#8a8fa0'}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: 240 }}>
                <div className="empty-state-icon">◎</div>
                <p>No expense data yet</p>
              </div>
            )}
            {/* Legend */}
            {pieData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '0.5rem' }}>
                {pieData.map((entry) => (
                  <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[entry.category] || '#8a8fa0' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Savings Goals Summary */}
        {(data?.savings_summary || []).length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Savings Progress</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {data.savings_summary.map((goal) => (
                <div key={goal.id} style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{goal.name}</span>
                    <span className={`goal-status ${goal.progress_percentage >= 100 ? 'completed' : goal.is_on_track ? 'on-track' : 'behind'}`}>
                      {goal.progress_percentage >= 100 ? '✓ Done' : goal.is_on_track ? '↑ On track' : '↓ Behind'}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className={`progress-bar-fill ${!goal.is_on_track && goal.progress_percentage < 100 ? 'behind' : ''}`}
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex-between" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{fmt(goal.current_amount)}</span>
                    <span>{Math.round(goal.progress_percentage)}% of {fmt(goal.target_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
