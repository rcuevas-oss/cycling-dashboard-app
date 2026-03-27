import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
} from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { Connection, Edge, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import TrainingNode from './TrainingNode';
import AthleteNode from './AthleteNode';
import { useDnD } from '../../contexts/DnDContext';
import { WORKOUT_LIBRARY } from '../../lib/coach/types';
import type { TrainingWorkout, AthleteProfile, HistoricalWorkout } from '../../lib/coach/types';

const nodeTypes: NodeTypes = {
  training: TrainingNode,
  athlete: AthleteNode,
};

const initialNodes: any[] = [];
const initialEdges: Edge[] = [];

// Helper function to calculate backtesting metrics
export const calculateBacktesting = (
  nodes: any[], 
  edges: Edge[], 
  baselineAthlete?: AthleteProfile,
  historicalData: HistoricalWorkout[] = []
) => {
  if (nodes.length === 0) return null;

  // 1. Build adjacency list and find in-degrees
  const inDegree: Record<string, number> = {};
  const nextNodeMap: Record<string, string[]> = {};
  
  nodes.forEach(n => {
    inDegree[n.id] = 0;
    nextNodeMap[n.id] = [];
  });
  edges.forEach(e => {
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target]++;
    }
    if (nextNodeMap[e.source]) {
      nextNodeMap[e.source].push(e.target);
    }
  });

  // 3. Find the start node (root) in the MAIN sequence
  let rootNodes = nodes.filter(n => inDegree[n.id] === 0);
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [[...nodes].sort((a,b) => a.position.x - b.position.x)[0]];
  } else {
    rootNodes.sort((a,b) => a.position.x - b.position.x);
  }

  // 3. Traverse the graph to build the day sequence
  const sequence: any[] = [];
  const visited = new Set<string>();
  
  let currentId: string | undefined = rootNodes[0]?.id;
  
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodes.find(n => n.id === currentId);
    if (node) sequence.push(node);
    
    // Move to next node in the chain
    const nexts = nextNodeMap[currentId];
    if (nexts && nexts.length > 0) {
      currentId = nexts[0];
    } else {
      currentId = undefined;
    }
  }
  
  // Append any disconnected nodes sorted by X position
  const unvisited = nodes.filter(n => !visited.has(n.id)).sort((a,b) => a.position.x - b.position.x);
  
  const allNodesInSequence = [...sequence, ...unvisited];
  // Filter out athlete nodes before attempting to read workout data
  const evaluationNodes = allNodesInSequence.filter(n => n.type !== 'athlete');

  let totalDurationMins = 0;
  let totalTSS = 0;
  let totalEnergyExpenditureKj = 0;
  
  // Start from the baseline if available
  let ctl = baselineAthlete ? baselineAthlete.currentCtl : 0; 
  let atl = baselineAthlete ? baselineAthlete.currentAtl : 0; 
  const FTP = baselineAthlete ? baselineAthlete.ftp : 250; 
  
  // 4. Map the newly built flow representing FUTURE dates
  const futureStats = evaluationNodes.map((node, index) => {

    // It's a training block
    const w = node.data.workout as TrainingWorkout | undefined;
    const durationMins = w?.durationMins ?? 60; // Safe fallback (use ?? so 0 is preserved)
    
    // Default IF to 0.6 if missing, but preserve 0.0 for Rest Days
    const intensityFactor = w?.intensityFactor ?? 0.6;
    const targetPower = Math.round(FTP * intensityFactor);
    const title = w?.title || node.data.label || 'Workout';
    
    
    
    // Calculate mechanical work: Joules = Watts * Seconds. 1 kJ is roughly 1 kcal burned
    const mechanicalWorkKj = Math.round((targetPower * (durationMins * 60)) / 1000);
    totalEnergyExpenditureKj += mechanicalWorkKj;
    
    // Calculate approximate TSS based on IF and duration (1 hr @ IF 1.0 = 100 TSS)
    const approximateTSS = Math.round((durationMins / 60) * (intensityFactor * intensityFactor) * 100) || 0;
    
    totalDurationMins += durationMins;
    totalTSS += approximateTSS;

    // Update CTL and ATL using exponential moving average (Defensive NaN protection)
    ctl = (ctl + (approximateTSS - ctl) * (1 / 42)) || 0;
    atl = (atl + (approximateTSS - atl) * (1 / 7)) || 0;
    const tsb = Math.round(ctl - atl);
    
    return {
      day: index + 1, // Offset day index for the chart
      isHistory: false,
      title: title,
      tss: approximateTSS,
      energyExpended: mechanicalWorkKj,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb,
      meta: w // Keep the full AI workout payload (steps, duration, zone) for the Database Calendar View!
    };
  });
  
  // 5. Build historical stats for the chart mapping
  let historyDaysOffset = historicalData.length;
  // Let's recalculate the history to plot the smooth curve before day 1 (unless pre-calculated)
  let histCtl = 0;
  let histAtl = 0;
  
  const formattedHistoryStats = historicalData.map((day: any, index) => {
    // Si viene la data precalculada real del dashboard (pmcHistory)
    if (day.ctlDisplayed !== undefined) {
      histCtl = day.ctlDisplayed;
      histAtl = day.atlDisplayed;
      return {
        day: -(historyDaysOffset - index - 1),
        isHistory: true,
        title: day.title || day.date,
        tss: day.tss || 0,
        ctl: day.ctlDisplayed,
        atl: day.atlDisplayed,
        tsb: day.tsbDisplayed
      };
    }

    // Fallback: cálculo iterativo desde 0
    histCtl = histCtl + (day.tss - histCtl) * (1 / 42);
    histAtl = histAtl + (day.tss - histAtl) * (1 / 7);
    
    return {
      day: -(historyDaysOffset - index - 1), // e.g., -41, -40, ..., 0
      isHistory: true,
      title: day.title,
      tss: day.tss,
      ctl: Math.round(histCtl),
      atl: Math.round(histAtl),
      tsb: Math.round(histCtl - histAtl)
    };
  });

  // Ensure we always have a Day 0 baseline to anchor the chart lines!
  const hasHistoryDayZero = formattedHistoryStats.some(s => s.day === 0);
  const baselineDay0 = {
    day: 0,
    isHistory: true,
    title: 'Baseline (Today)',
    tss: 0,
    energyExpended: 0,
    ctl: baselineAthlete ? baselineAthlete.currentCtl : 0,
    atl: baselineAthlete ? baselineAthlete.currentAtl : 0,
    tsb: baselineAthlete ? baselineAthlete.currentTsb : 0,
  };
  
  const chartHistory = hasHistoryDayZero ? formattedHistoryStats : [...formattedHistoryStats, baselineDay0];

  // Combine history and future so the chart looks continuous
  const allStatsForChart = [...chartHistory, ...futureStats];

  return {
    sessions: evaluationNodes.filter(n => n.type === 'training').length,
    totalDurationMins,
    totalDurationHours: (totalDurationMins / 60).toFixed(1),
    totalTSS,
    energyExpenditure: totalEnergyExpenditureKj,
    stats: allStatsForChart, // Pass the full combined list to Recharts and Breakdown
    finalCtl: Math.round(ctl),
    finalAtl: Math.round(atl),
    finalTsb: Math.round(ctl - atl),
    chartData: allStatsForChart
  };
};

interface TrainingFlowProps {
  setBacktestResults: (results: any) => void;
  baselineAthlete?: AthleteProfile;
  historicalData?: HistoricalWorkout[];
  pendingAiPlan?: any[] | null;
  onAiPlanInjected?: () => void;
  clearTrigger?: number;
  reorderTrigger?: number;
}

const Flow: React.FC<TrainingFlowProps> = ({ 
  setBacktestResults, 
  baselineAthlete, 
  historicalData = [],
  pendingAiPlan,
  onAiPlanInjected,
  clearTrigger,
  reorderTrigger = 0
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [type] = useDnD();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isInjecting, setIsInjecting] = useState(false);

  // --- REORDER LOGIC ---
  useEffect(() => {
    if (reorderTrigger > 0) {
      setNodes(nds => {
        const trainingNodes = nds.filter(n => n.type === 'training');
        
        // Sort by current position to maintain the general sequence the user has or AI gave
        const sortedNodes = [...trainingNodes].sort((a, b) => {
            // Primarily by Y (rows) then X (columns)
            const rowA = Math.floor(a.position.y / 300);
            const rowB = Math.floor(b.position.y / 300);
            if (rowA !== rowB) return rowA - rowB;
            return a.position.x - b.position.x;
        });

        const startX = 500; // Relative to athlete at 50, 100
        const startY = 100;

        return nds.map(node => {
            if (node.type === 'training') {
                const idx = sortedNodes.findIndex(n => n.id === node.id);
                const col = idx % 7;
                const row = Math.floor(idx / 7);
                return {
                    ...node,
                    position: {
                        x: startX + (col * 420),
                        y: startY + (row * 450)
                    }
                };
            }
            return node;
        });
      });
      
      if (reactFlowInstance) {
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 800 }), 100);
      }
    }
  }, [reorderTrigger, reactFlowInstance, setNodes]);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const edgeParams = {
        ...params,
        animated: true,
        style: { stroke: '#007cc3', strokeWidth: 3 }, // Visible Garmin Blue line
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#007cc3', // Matching Garmin Blue arrowhead
        },
      } as Edge;
      setEdges((eds) => addEdge(edgeParams, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle athlete node specifically
      if (type === 'athlete') {
        if (!baselineAthlete) return;
        
        const newNode = {
          id: uuidv4(),
          type: 'athlete',
          position,
          data: { athlete: baselineAthlete, label: baselineAthlete.name },
        };
        setNodes((nds) => nds.concat(newNode));
        return; // Don't auto-connect the athlete node as a target, let user manually connect it to the chain
      }

      // 3. Find the workout from the library based on the dragged type (id)
      const workout = WORKOUT_LIBRARY.find((w) => w.id === type);
      if (!workout) return;

      const newNode = {
        id: uuidv4(),
        type: 'training',
        position,
        data: { workout, label: workout.title },
      };

      // Auto connect feature
      if (nodes.length > 0) {
        // Find nodes that don't already have an outgoing edge to avoid bifurcations
        const availableNodes = nodes.filter(n => !edges.some(e => e.source === n.id));
        const rightmostNode = [...availableNodes].sort((a, b) => b.position.x - a.position.x)[0];
        
        if (rightmostNode) {
          const newEdge: Edge = {
            id: `e-${rightmostNode.id}-${newNode.id}`,
            source: rightmostNode.id,
            target: newNode.id,
            sourceHandle: 'sequence-out',
            targetHandle: 'sequence-in',
            animated: true,
            style: { stroke: '#007cc3', strokeWidth: 3 }, // Visible Garmin Blue line
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#007cc3', // Matching garmin blue
            },
          };
          setEdges((eds) => addEdge(newEdge, eds));
        }
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes, edges, setNodes, setEdges, type, baselineAthlete],
  );
  
  // Auto update backtest on any changes
  React.useEffect(() => {
    const results = calculateBacktesting(nodes, edges, baselineAthlete, historicalData);
    setBacktestResults(results);
  }, [nodes, edges, baselineAthlete, historicalData, setBacktestResults]);

  // Listen for clear triggers from the parent component
  React.useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setNodes([]);
      setEdges([]);

      // Automaticamente inyectamos al atleta si existe como punto de partida 
      if (baselineAthlete) {
        setNodes([{
          id: uuidv4(),
          type: 'athlete',
          position: { x: 50, y: 100 },
          data: { athlete: baselineAthlete, label: baselineAthlete.name }
        }]);
      }
      
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
        }, 50);
      }
    }
  }, [clearTrigger, setNodes, setEdges, baselineAthlete, reactFlowInstance]);

  // Inject AI Plan automatically
  React.useEffect(() => {
    if (pendingAiPlan && pendingAiPlan.length > 0 && reactFlowInstance && !isInjecting) {
      setIsInjecting(true);
      
      let currentX = 0;
      let currentY = 100;

      const newNodesToAdd: any[] = [];
      const newEdgesToAdd: Edge[] = [];

      // We use current nodes from the state at the moment the effect fires
      const availableNodes = nodes.filter(n => !edges.some(e => e.source === n.id));
      let rightmost = availableNodes.length > 0 ? [...availableNodes].sort((a,b) => b.position.x - a.position.x)[0] : null;
      let prevNodeId = rightmost ? rightmost.id : null;

      if (rightmost) {
        currentX = rightmost.position.x + 450;
        currentY = rightmost.position.y;
      } else {
        if (baselineAthlete) {
          const athleteNodeId = uuidv4();
          newNodesToAdd.push({
            id: athleteNodeId,
            type: 'athlete',
            position: { x: 50, y: 100 },
            data: { athlete: baselineAthlete, label: baselineAthlete.name }
          });
          prevNodeId = athleteNodeId;
          currentX = 500;
        } else {
          currentX = 50;
        }
      }

      pendingAiPlan.forEach((planNode, index) => {
        const libraryWorkout = WORKOUT_LIBRARY.find(w => w.id === planNode.workoutId);
        if (!libraryWorkout) return;

        const workout = { ...libraryWorkout };
        if (planNode.durationMinutes) {
          workout.durationMins = planNode.durationMinutes;
        }
        if (planNode.steps && Array.isArray(planNode.steps)) {
          workout.steps = planNode.steps;
        }
        if (planNode.coachNote) {
          workout.coachNote = planNode.coachNote;
        }

        const colIndex = index % 7;
        const rowIndex = Math.floor(index / 7);

        const newNodeId = uuidv4();
        const newNode = {
          id: newNodeId,
          type: 'training',
          position: { 
            x: currentX + (colIndex * 420), 
            y: currentY + (rowIndex * 450) 
          },
          data: { workout, label: workout.title, tooltipInfo: planNode.rationale }
        };

        newNodesToAdd.push(newNode);

        if (prevNodeId) {
          const newEdge: Edge = {
            id: `e-${prevNodeId}-${newNodeId}`,
            source: prevNodeId,
            target: newNodeId,
            sourceHandle: 'sequence-out',
            targetHandle: 'sequence-in',
            animated: true,
            style: { stroke: '#007cc3', strokeWidth: 3 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#007cc3',
            },
          };
          newEdgesToAdd.push(newEdge);
        }
        
        prevNodeId = newNodeId;
      });

      // Batch state updates and clear the signal
      setNodes(nds => [...nds, ...newNodesToAdd]);
      setEdges(eds => [...eds, ...newEdgesToAdd]);
      
      if (onAiPlanInjected) onAiPlanInjected();
      setIsInjecting(false);
      
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    }
  }, [pendingAiPlan, reactFlowInstance, onAiPlanInjected]); // REMOVED nodes, edges from deps!

  return (
    <div className="flow-wrapper" style={{ flex: 1, height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#007cc3', strokeWidth: 3 }, // Global Garmin Blue default
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#007cc3',
          },
        }}
        minZoom={0.05}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background gap={24} size={2} color="#2e3340" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default Flow;
