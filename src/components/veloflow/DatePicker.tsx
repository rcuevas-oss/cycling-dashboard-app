import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = "Seleccionar fecha", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDate = value ? new Date(value) : null;

  const handleDateClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4 px-1">
        <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-zinc-200 capitalize tracking-wide">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2" translate="no">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    // Force week to start on Monday (weekStartsOn: 1)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          // Crucial part to solve the user's issue: hide days from other months
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          
          if (!isCurrentMonth) {
            return <div key={i} className="h-8 w-full"></div>; // Empty cell to maintain grid, no numbers shown
          }

          return (
            <button
              key={i}
              onClick={() => handleDateClick(day)}
              className={`
                h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all
                ${isSelected 
                  ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]' 
                  : isToday
                    ? 'bg-zinc-800/50 text-indigo-400 font-bold border border-indigo-500/30'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }
              `}
            >
              {format(day, dateFormat)}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-3 text-sm transition-all focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 ${value ? 'text-zinc-200' : 'text-zinc-500'} ${className}`}
      >
        <span>{value ? format(new Date(value), 'dd MMM, yyyy', { locale: es }) : placeholder}</span>
        <CalendarIcon className="w-4 h-4 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#141416]/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl shadow-black/50 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {renderHeader()}
          {renderDaysOfWeek()}
          {renderCells()}
        </div>
      )}
    </div>
  );
};

export default DatePicker;
