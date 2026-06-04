import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/reports/analytics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Loading Analytics...</span></div>;
  if (!data) return <div className="empty-state">Failed to load analytics</div>;

  return (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ marginBottom: '20px' }}>📈 Analytics Dashboard</h3>

      {/* Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--text-secondary)' }}>Overall Feedback Rating</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffd700' }}>
            {data.avgRating} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ 5.0</span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--text-secondary)' }}>Data-Driven Insights</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text)' }}>
            {data.insights.map((insight, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Trend Chart */}
        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: '0 0 20px' }}>Performance Trends (Avg Score)</h4>
          <div style={{ height: 300 }}>
            {data.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="avgScore" stroke="#00C49F" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Average %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '100px' }}>Not enough data</div>
            )}
          </div>
        </div>

        {/* Issues Chart */}
        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: '0 0 20px' }}>Reported Issues by Category</h4>
          <div style={{ height: 300 }}>
            {data.issueData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.issueData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.issueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '100px' }}>No issues reported</div>
            )}
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
              {data.issueData.filter(d => d.value > 0).map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ width: 12, height: 12, backgroundColor: COLORS[index % COLORS.length], marginRight: 6, borderRadius: 2 }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
