import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { User, Activity, X } from 'lucide-react';
import type { AthleteProfile } from '../../lib/coach/types';

import './AthleteNode.css';

export type AthleteNodeType = Node<{ athlete: AthleteProfile; label: string }, 'athlete'>;

const AthleteNode: React.FC<NodeProps<AthleteNodeType>> = ({ id, data, selected }) => {
  const { athlete } = data;
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div className={`athlete-node glass-panel ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn" onClick={onDelete} aria-label="Delete node">
        <X size={18} />
      </button>

      <div className="node-header athlete-header">
        <User size={20} className="node-icon" />
        <span className="node-title">{athlete.name}</span>
      </div>
      
      <div className="node-body athlete-body">
        <div className="node-stat athlete-stat">
          <span>FTP</span>
          <strong>{athlete.ftp}W</strong>
        </div>
        <div className="node-stat athlete-stat">
          <span>Weight</span>
          <strong>{athlete.weightKg}kg</strong>
        </div>
      </div>
      
      <div className="node-footer athlete-footer">
        <div className="ctl-badge">
          <Activity size={14} />
          <span>Base CTL: {athlete.currentCtl}</span>
        </div>
        <div className="ctl-info">Start connecting your training plan here.</div>
      </div>
      
      <Handle type="source" position={Position.Right} id="sequence-out" className="handle handle-source athlete-handle" />
    </div>
  );
};

export default React.memo(AthleteNode);
