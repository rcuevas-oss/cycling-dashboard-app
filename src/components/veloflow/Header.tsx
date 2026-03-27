import React from 'react';
import { User, Activity } from 'lucide-react';
import type { AthleteProfile } from '../../lib/coach/types';
import './Header.css';

interface HeaderProps {
  athlete?: AthleteProfile;
}

const Header: React.FC<HeaderProps> = ({ athlete }) => {
  return (
    <header className="app-header glass-panel">
      <div className="header-brand">
        <h1>VeloFlow</h1>
        <span className="badge">Pro Backtester</span>
      </div>
      <div className="header-actions">
        {athlete && (
          <div className="athlete-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-color)', padding: '6px 16px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <User size={16} />
              <span style={{ fontWeight: 500 }}>{athlete.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>FTP: <strong style={{color: 'var(--text-primary)'}}>{athlete.ftp}W</strong></span>
              <span>Weight: <strong style={{color: 'var(--text-primary)'}}>{athlete.weightKg}kg</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
              <Activity size={14} color="#38bdf8" />
              <span>Base CTL: <strong style={{color: '#38bdf8'}}>{athlete.currentCtl}</strong></span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
