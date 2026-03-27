import React, { useState } from 'react';
import { Bot, Sparkles, X, Target, CalendarDays, Activity, Flame, Clock } from 'lucide-react';
import { generateWidgetPlan, CoachPlanResponse } from '../../lib/coach/ai/plannerGenerator';
import DatePicker from './DatePicker';

interface AIPlannerWidgetProps {
  onClose: () => void;
  onInjectPlan: (response: CoachPlanResponse) => void;
  athleteProfile: any;
}

type PlanningMode = 'microcycle' | 'event';

const AIPlannerWidget: React.FC<AIPlannerWidgetProps> = ({ onClose, onInjectPlan, athleteProfile }) => {
  const [planningMode, setPlanningMode] = useState<PlanningMode>('microcycle');
  
  // Microcycle State
  const [microcycleType, setMicrocycleType] = useState('auto');
  const [microcycleDuration, setMicrocycleDuration] = useState('7');

  // Safety Metric calculation
  const tsb = athleteProfile.currentTsb || 0;
  const isDangerZone = tsb < -25;
  const isHighFatigue = tsb < -10;

  // ... (rest of state remains same)
  
  // Event State
  const [targetDate, setTargetDate] = useState('');
  const [trainingMethodology] = useState('noruego'); // Hardcoded to Norwegian method
  
  // Shared State
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
  const [hoursPerDay, setHoursPerDay] = useState<Record<string, number>>({
    'Lunes': 1.5, 'Martes': 1.5, 'Miércoles': 1.5, 'Jueves': 1.5, 'Viernes': 1.5, 'Sábado': 3, 'Domingo': 3
  });
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor' | 'both'>('both');
  
  const [flexibility, setFlexibility] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const updateHours = (day: string, hours: number) => {
    setHoursPerDay(prev => ({ ...prev, [day]: Math.max(0.5, Math.min(10, hours)) }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key de Gemini no encontrada.");
        setIsGenerating(false);
        return;
      }

      const response = await generateWidgetPlan(
        apiKey,
        {
          planningMode,
          microcycleType,
          microcycleDuration,
          targetDate,
          trainingMethodology,
          flexibility,
          daysAvailable: selectedDays,
          hoursPerDay,
          indoorOutdoor
        },
        athleteProfile
      );

      if (response && 'error' in response) {
        alert(`Error de IA: ${response.error}`);
        return;
      }

      if (response && 'planNodes' in response && response.planNodes.length > 0) {
        onInjectPlan(response);
        onClose();
      } else {
        alert("La IA no devolvió un plan válido o hubo un error de conexión.");
      }
    } catch (error) {
      console.error(error);
      alert("Fallo crítico en la generación de IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[50%] w-[440px] max-h-[90vh] flex flex-col bg-[#141416]/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl shadow-indigo-500/10 rounded-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-black/40 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100 text-[15px] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">AI Logic Builder</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Gemini 2.0 Flash</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="p-5 pb-0">
        <div className="flex bg-black/50 p-1 rounded-xl border border-zinc-800/80">
          <button 
            onClick={() => setPlanningMode('microcycle')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${planningMode === 'microcycle' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Activity className="w-3.5 h-3.5" />
            Microciclo Directo
          </button>
          <button 
            onClick={() => setPlanningMode('event')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${planningMode === 'event' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Target className="w-3.5 h-3.5" />
            Objetivo a Plazo
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        
        {planningMode === 'microcycle' ? (
          <div key="microcycle-mode" className="space-y-5">
            {/* Microcycle Specific Settings */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Fase de Entrenamiento
              </label>
              <select 
                value={microcycleType}
                onChange={(e) => setMicrocycleType(e.target.value)}
                className={`w-full bg-[#09090b] border ${isHighFatigue && microcycleType !== 'recuperacion' && microcycleType !== 'auto' ? 'border-amber-500/50' : 'border-zinc-800'} rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer`}
              >
                <option value="auto">✨ Automático (Análisis IA)</option>
                <option value="ajuste">Introducción / Ajuste</option>
                <option value="carga">Bloque de Carga (Desarrollador)</option>
                <option value="choque">Bloque de Choque (Sobrecarga Controlada)</option>
                <option value="recuperacion">Semana de Descarga / Regenerativa</option>
                <option value="tapering">Afinamiento Pre-Competición (Tapering)</option>
              </select>

              {isHighFatigue && microcycleType !== 'recuperacion' && microcycleType !== 'auto' && (
                <div className={`border p-2.5 rounded-lg mt-2 flex items-start gap-2 animate-in slide-in-from-top-1 duration-200 ${isDangerZone ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <Activity className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDangerZone ? 'text-rose-500' : 'text-amber-500'}`} />
                  <p className={`text-[10px] leading-tight ${isDangerZone ? 'text-rose-200' : 'text-amber-200'}`}>
                    <span className={`font-bold uppercase ${isDangerZone ? 'text-rose-500' : 'text-amber-500'}`}>
                      {isDangerZone ? '⚠️ Alerta Crítica:' : 'Aviso de Fatiga:'}
                    </span> {isDangerZone ? 'Tu fatiga es extrema. Riesgo alto de lesión.' : `Tu frescura (TSB: ${tsb.toFixed(0)}) es baja.`} 
                    Te recomendamos usar <span className="text-white font-bold italic">Automático</span> o <span className="text-white font-bold italic">Recuperación</span>.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Duración del Microciclo
              </label>
              <select 
                value={microcycleDuration}
                onChange={(e) => setMicrocycleDuration(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="7">1 Semana (Microciclo Estándar)</option>
                <option value="14">2 Semanas (Microciclo Extendido)</option>
                <option value="21">3 Semanas (Bloque de Carga)</option>
                <option value="28">4 Semanas (Mesociclo Completo)</option>
              </select>
            </div>
          </div>
        ) : (
          <div key="event-mode" className="space-y-5">
            {/* Event Specific Settings */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400" />
                Día del Peak Performance (Evento)
              </label>
              <DatePicker 
                value={targetDate}
                onChange={setTargetDate}
              />
              <p className="text-[11px] text-zinc-500 leading-tight mt-1">
                La IA trazará una ruta regresiva de TSB (Periodización) desde esta fecha hasta el día de hoy.
              </p>
            </div>

            {/* Hidden methodology - currently hardcoded to Norwegian method base on system direction */}
          </div>
        )}

        {/* Availability Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-800/50">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            Disponibilidad Semanal
          </label>
          
          <div className="flex flex-wrap justify-between gap-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => {
              const fullDay = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i];
              const isSelected = selectedDays.includes(fullDay);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(fullDay)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${isSelected 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 ring-1 ring-emerald-500/20' 
                    : 'bg-[#09090b] text-zinc-600 border border-zinc-800 hover:border-zinc-700'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {selectedDays.length > 0 && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Horas por Día</p>
                <div className="grid grid-cols-4 gap-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                    .filter(d => selectedDays.includes(d))
                    .map(d => (
                      <div key={d} className="flex flex-col items-center gap-1 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">{d.slice(0, 3)}</span>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0.5"
                          max="10"
                          value={hoursPerDay[d] || 1.5}
                          onChange={(e) => updateHours(d, parseFloat(e.target.value))}
                          className="w-full bg-transparent text-center font-bold text-emerald-400 text-[11px] focus:outline-none"
                        />
                      </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Preferencia de Entorno</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIndoorOutdoor('outdoor')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${indoorOutdoor === 'outdoor' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'}`}
                  >
                    Ruta
                  </button>
                  <button 
                    onClick={() => setIndoorOutdoor('indoor')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${indoorOutdoor === 'indoor' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'}`}
                  >
                    Rodillo
                  </button>
                  <button 
                    onClick={() => setIndoorOutdoor('both')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${indoorOutdoor === 'both' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'}`}
                  >
                    Mix
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flexibility / Extra Context (Shared) */}
        <div className="space-y-2 mt-5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Condiciones Especiales (Opcional)
          </label>
          <textarea 
            value={flexibility}
            onChange={(e) => setFlexibility(e.target.value)}
            placeholder="Ej: Tengo carrera el próximo domingo. Evitar series el viernes."
            rows={2}
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none custom-scrollbar placeholder:text-zinc-700"
          />
        </div>

      </div>

      {/* Footer / Action */}
      <div className="p-5 border-t border-zinc-800/80 bg-black/40 rounded-b-2xl">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || (planningMode === 'event' && !targetDate)}
          className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group border disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:shadow-none
            ${planningMode === 'microcycle' 
              ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]' 
              : 'bg-rose-600 hover:bg-rose-500 border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)]'
            }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span>Analizando Biometría y Carga...</span>
            </>
          ) : (
            <>
              <Sparkles className={`w-4 h-4 ${planningMode === 'microcycle' ? 'text-indigo-200' : 'text-rose-200'} group-hover:text-white transition-colors`} />
              <span className="tracking-wide">{planningMode === 'microcycle' ? 'Inyectar Microciclo AI' : 'Generar Periodización AI'}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default AIPlannerWidget;
