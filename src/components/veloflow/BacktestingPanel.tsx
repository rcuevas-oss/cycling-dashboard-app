import React from 'react';
import { X, CalendarDays, Activity, Timer, Flame, Apple } from 'lucide-react';
import { ComposedChart, Area, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

import './BacktestingPanel.css';

interface BacktestingPanelProps {
  results: any;
  onClose: () => void;
}

const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ results, onClose }) => {
  if (!results) return null;

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h2>Backtesting Analysis</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close panel" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
          <X size={20} />
        </button>
      </div>
      
      <div className="panel-body">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon"><CalendarDays size={20} color="var(--accent-color)" /></div>
              <div className="card-data">
                <span className="card-label">Total Sessions</span>
                <span className="card-value">{results.sessions}</span>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon"><Timer size={20} color="#10b981" /></div>
              <div className="card-data">
                <span className="card-label">Total Duration</span>
                <span className="card-value">{results.totalDurationHours} <small>hrs</small></span>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon"><Activity size={20} color="#f97316" /></div>
              <div className="card-data">
                <span className="card-label">Est. TSS Load</span>
                <span className="card-value">{results.totalTSS}</span>
              </div>
            </div>
          </div>

          <div className="summary-cards metrics-row">
            {/* CTL — sky blue (#38bdf8) — same as dashboard */}
            <div className="summary-card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.05)' }}>
              <div className="card-data">
                <span className="card-label" style={{ color: '#38bdf8' }}>Aptitud (CTL)</span>
                <span className="card-value" style={{ color: '#38bdf8' }}>{results.finalCtl}</span>
              </div>
            </div>
            {/* ATL — rose (#fb7185) — same as dashboard */}
            <div className="summary-card" style={{ borderColor: 'rgba(251, 113, 133, 0.3)', background: 'rgba(251, 113, 133, 0.05)' }}>
              <div className="card-data">
                <span className="card-label" style={{ color: '#fb7185' }}>Fatiga (ATL)</span>
                <span className="card-value" style={{ color: '#fb7185' }}>{results.finalAtl}</span>
              </div>
            </div>
            {/* TSB — dynamic color by value (same logic as dashboard bars) */}
            <div className="summary-card" style={{
              borderColor: results.finalTsb > 10 ? 'rgba(52,211,153,0.3)' : results.finalTsb > 0 ? 'rgba(16,185,129,0.3)' : results.finalTsb < -20 ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)',
              background:  results.finalTsb > 10 ? 'rgba(52,211,153,0.05)' : results.finalTsb > 0 ? 'rgba(16,185,129,0.05)' : results.finalTsb < -20 ? 'rgba(244,63,94,0.05)' : 'rgba(245,158,11,0.05)'
            }}>
              <div className="card-data">
                <span className="card-label" style={{ color: results.finalTsb > 10 ? '#34d399' : results.finalTsb > 0 ? '#10b981' : results.finalTsb < -20 ? '#f43f5e' : '#f59e0b' }}>Frescura (TSB)</span>
                <span className="card-value" style={{ color: results.finalTsb > 10 ? '#34d399' : results.finalTsb > 0 ? '#10b981' : results.finalTsb < -20 ? '#f43f5e' : '#f59e0b' }}>
                  {results.finalTsb > 0 ? '+' : ''}{results.finalTsb}
                </span>
              </div>
            </div>
          </div>

          {/* Nutrition Summary */}
          {results.nutritionIntake && (
            <div className="nutrition-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div className="summary-card" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><Flame size={20} color="#f59e0b" /></div>
                <div className="card-data">
                  <span className="card-label">Energy Balance</span>
                  <span className="card-value" style={{ fontSize: '1.2rem', color: results.nutritionIntake.netEnergy < 0 ? '#ef4444' : '#10b981' }}>
                    {results.nutritionIntake.netEnergy > 0 ? '+' : ''}{results.nutritionIntake.netEnergy} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>kcal</span>
                  </span>
                </div>
              </div>
              <div className="summary-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><Apple size={20} color="#10b981" /></div>
                <div className="card-data">
                  <span className="card-label">Total Macros</span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                    <span style={{ color: '#f59e0b' }}>{results.nutritionIntake.carbs}g C</span>
                    <span style={{ color: '#10b981' }}>{results.nutritionIntake.protein}g P</span>
                    <span style={{ color: '#ef4444' }}>{results.nutritionIntake.fats}g F</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {results.stats.length > 0 && (
            <div className="chart-section mt-6">
              <h3 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>
                Cuadro de Gestión del Desempeño (PMC)
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={results.chartData || results.stats}
                    margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="veloCtlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.30}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.4} />

                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                      dy={10}
                      minTickGap={20}
                      tickFormatter={(val) => {
                        // Future days: "D+1", "D+2"…  History: show date relative label
                        if (val > 0) return `+${val}d`;
                        if (val === 0) return 'Hoy';
                        return `${val}d`;
                      }}
                    />

                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 10 }}
                    />

                    <ReferenceLine y={0} yAxisId="left" stroke="#52525b" strokeDasharray="3 3" />

                    <Tooltip
                      wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#3f3f46',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                        fontSize: '13px'
                      }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}
                      labelFormatter={(label) => {
                        if (label === 0) return 'Hoy (Baseline)';
                        if (label > 0) return `Día planificado +${label}`;
                        return `Hace ${Math.abs(label as number)} días`;
                      }}
                      formatter={(value: any, name: any) => [
                        <span style={{ fontWeight: 700 }}>{Math.round(Number(value))}</span>,
                        <span style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>{String(name)}</span>
                      ]}
                      isAnimationActive={false}
                    />

                    {/* TSB as colored bars (same color logic as dashboard) */}
                    <Bar yAxisId="left" dataKey="tsb" name="TSB (Bars)" barSize={10} radius={[2, 2, 0, 0]} fill="#f59e0b" opacity={0.6}>
                      {(results.chartData || results.stats).map((entry: any, index: number) => {
                        const color = entry.tsb > 10 ? '#34d399'
                          : entry.tsb > 0  ? '#10b981'
                          : entry.tsb < -20 ? '#f43f5e'
                          : '#f59e0b';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>

                    {/* TSB as a Line for better visibility of the trend */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="tsb"
                      name="TSB Trend"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#f59e0b' }}
                      isAnimationActive={false}
                    />

                    {/* CTL – sky blue area with gradient (matches dashboard exactly) */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="ctl"
                      name="CTL"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#veloCtlGrad)"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#38bdf8' }}
                      isAnimationActive={false}
                    />

                    {/* ATL – rose line, no fill (matches dashboard) */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="atl"
                      name="ATL"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill="none"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#fb7185' }}
                      isAnimationActive={false}
                    />

                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '12px', color: 'var(--text-secondary)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          
          <div className="breakdown-section mt-6">
            <h3>Planned Sequence</h3>
            <div className="breakdown-list">
              {results.stats.filter((s: any) => !s.isHistory && !s.isNutrition).map((stat: any, index: number) => (
                <div key={index} className="breakdown-item detailed">
                  <div className="breakdown-info">
                    <span className="breakdown-day">Day {stat.day}</span>
                    <span className="breakdown-title">{stat.title}</span>
                  </div>
                  
                  <div className="breakdown-metrics">
                    <span className="metric-badge tss">{stat.tss} TSS</span>
                    <span className="metric-badge" style={{ color: '#ef4444' }}><Flame size={12} style={{display: 'inline', marginRight: '2px', verticalAlign: 'text-bottom'}} /> {stat.energyExpended} kJ</span>
                    <span className="metric-badge ctl">CTL: {stat.ctl}</span>
                    <span className="metric-badge tsb">TSB: {stat.tsb > 0 ? '+' : ''}{stat.tsb}</span>
                  </div>

                  {(stat.nutritionCalories > 0 || stat.nutritionCarbs > 0) && (
                     <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                       <Apple size={14} color="#10b981" />
                       <span>Intake: <strong style={{ color: '#f59e0b'}}>{stat.nutritionCalories} kcal</strong> / <strong>{stat.nutritionCarbs}g Carbs</strong></span>
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default BacktestingPanel;
