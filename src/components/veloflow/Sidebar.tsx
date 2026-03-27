import React from 'react';
import { useDnD } from '../../contexts/DnDContext';
import { WORKOUT_LIBRARY } from '../../lib/coach/types';
import type { TrainingWorkout } from '../../lib/coach/types';
import './Sidebar.css';
import { Activity, Clock, Zap, GripVertical, User } from 'lucide-react';
interface SidebarProps {
  athleteName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ athleteName = 'Atleta Activo' }) => {
  const [_, setType] = useDnD();

  const zoneMap: Record<string, string> = {
    rest: 'Descanso',
    recovery: 'Z1 Recup.',
    endurance: 'Z2 Fondo',
    tempo: 'Z3 Tempo',
    threshold: 'Z4 Umbral',
    vo2max: 'Z5 VO2',
    anaerobic: 'Z6 Anae.'
  };

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, workoutId: string) => {
    setType(workoutId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <h2>Workout Library</h2>
        <p>Drag nodes to build a plan</p>
      </div>
      
      <div className="nodes-container">
        {/* Athlete Trigger Node */}
        <div 
          className="library-node zone-recovery"
          style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-surfaces-hover)' }}
          onDragStart={(event) => onDragStart(event, 'athlete')}
          draggable
        >
          <div className="library-node-grabber">
            <GripVertical size={16} />
          </div>
          <div className="library-node-content">
            <div className="library-node-title">
              <User size={14} />
              <span>{athleteName}</span>
            </div>
            <div className="library-node-stats">
              <span className="stat">Trigger Node</span>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '16px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workouts</div>

        {WORKOUT_LIBRARY.map((workout: TrainingWorkout) => (
          <div 
            key={workout.id}
            className={`library-node zone-${workout.zone}`}
            onDragStart={(event) => onDragStart(event, workout.id)}
            draggable
          >
            <div className="library-node-grabber">
              <GripVertical size={16} />
            </div>
            <div className="library-node-content">
              <div className="library-node-title">
                <Activity size={14} />
                <span>{workout.title}</span>
              </div>
              <div className="library-node-stats">
                <span className="stat"><Clock size={12}/> {workout.durationMins}m</span>
                <span className="stat"><Zap size={12}/> {zoneMap[workout.zone] || workout.zone}</span>
              </div>
            </div>
          </div>
        ))}
        
      </div>
    </aside>
  );
};

export default Sidebar;
