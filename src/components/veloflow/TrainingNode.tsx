import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { Activity, Clock, Zap, X, Edit2, Bot } from 'lucide-react';
import type { TrainingNodeData } from '../../lib/coach/types';

import './TrainingNode.css';

export type TrainingNodeType = Node<TrainingNodeData, 'training'>;

const TrainingNode: React.FC<NodeProps<TrainingNodeType>> = ({ id, data, selected }) => {
  const { workout } = data;
  const { setNodes, setEdges } = useReactFlow();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(workout.durationMins.toString());

  const zoneMap: Record<string, string> = {
    rest: 'Descanso',
    recovery: 'Z1 Recup.',
    endurance: 'Z2 Fondo',
    tempo: 'Z3 Tempo',
    threshold: 'Z4 Umbral',
    vo2max: 'Z5 VO2',
    anaerobic: 'Z6 Anae.'
  };

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };
  
  const handleEditSubmit = () => {
      setIsEditing(false);
      const newDuration = parseInt(editValue, 10);
      if (!isNaN(newDuration) && newDuration >= 0) {
          setNodes((nds) => nds.map((n) => {
              if (n.id === id) {
                  const nodeData = n.data as TrainingNodeData;
                  return {
                      ...n,
                      data: {
                          ...nodeData,
                          workout: {
                              ...nodeData.workout,
                              durationMins: newDuration
                          }
                      }
                  } as TrainingNodeType;
              }
              return n;
          }));
      } else {
          // Reset to original if invalid
          setEditValue(workout.durationMins.toString());
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleEditSubmit();
      } else if (e.key === 'Escape') {
          setIsEditing(false);
          setEditValue(workout.durationMins.toString());
      }
  };

  return (
    <div className={`training-node glass-panel ${selected ? 'selected' : ''} zone-${workout.zone}`}>
      <button className="node-delete-btn" onClick={onDelete} aria-label="Delete node">
        <X size={18} />
      </button>
      <Handle type="target" position={Position.Left} id="sequence-in" className="handle handle-target" />
      
      <div className="node-header">
        <Activity size={16} className="node-icon" />
        <span className="node-title">{workout.title}</span>
      </div>
      
      <div className="node-body">
        <div className="node-stat editable-stat" 
             onClick={() => setIsEditing(true)} 
             title="Click para editar duración"
        >
          <Clock size={14} className="stat-icon min-w-fit" />
          {isEditing ? (
              <input 
                 autoFocus
                 type="number"
                 className="bg-zinc-900 border border-garmin-blue rounded text-white px-1 py-0 w-14 text-xs font-mono outline-none"
                 value={editValue}
                 onChange={(e) => setEditValue(e.target.value)}
                 onBlur={handleEditSubmit}
                 onKeyDown={handleKeyDown}
                 min="0"
              />
          ) : (
              <span className="editable-value">
                  {workout.durationMins}m
                  <Edit2 size={10} className="edit-icon" />
              </span>
          )}
        </div>
        <div className="node-stat" title={`${Math.round(workout.intensityFactor * 100)}% FTP`}>
          <Zap size={14} className="stat-icon" />
          <span>
            {data.athleteFtp && workout.zone !== 'rest' 
                ? `${Math.round(workout.intensityFactor * (data.athleteFtp as number))}W` 
                : `${zoneMap[workout.zone] || workout.zone}`}
          </span>
        </div>
      </div>
      
      <div className="node-footer flex flex-col gap-2">
        <div className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-2 py-0.5">{workout.description}</div>
        
        {workout.coachNote && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2 flex flex-col gap-1">
             <div className="flex items-center gap-1.5 ">
                 <Bot className="w-3.5 h-3.5 text-indigo-400" />
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Nota del Coach</span>
             </div>
             <p className="text-[10px] text-indigo-100/90 leading-tight font-medium italic">"{workout.coachNote}"</p>
          </div>
        )}

        {workout.steps && workout.steps.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-zinc-800/80">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Pasos Estructurados (AI)</span>
            <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {workout.steps.map((step, idx) => {
                  let typeColor = "text-zinc-500";
                  if (step.type === 'warmup') typeColor = "text-emerald-500";
                  if (step.type === 'active') typeColor = "text-rose-500";
                  if (step.type === 'recovery' || step.type === 'cooldown') typeColor = "text-blue-500";
                  
                  return (
                  <div key={idx} className="flex flex-col bg-black/40 px-2 py-1.5 rounded border border-zinc-800/50">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full bg-current ${typeColor}`} />
                        <span className="text-[10px] text-zinc-200 font-bold truncate" title={step.name}>{step.name}</span>
                    </div>
                    
                    {step.description && (
                        <p className="text-[9px] text-zinc-400 mt-0.5 leading-tight">{step.description}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-zinc-900">
                      <span className="text-garmin-blue">{step.duration}</span>
                      <span className="text-indigo-400 font-bold">{step.power}</span>
                    </div>
                  </div>
                )})}
            </div>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} id="sequence-out" className="handle handle-source" />
    </div>
  );
};

export default React.memo(TrainingNode);
