import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = "Select date",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value (YYYY-MM-DD) or default to today
  const getInitialDate = () => {
    if (value) return new Date(value);
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate()); // For navigation
  
  // Update navigation date if value changes externaly
  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateSelect = (day: number) => {
    // Construct YYYY-MM-DD string locally to avoid timezone issues
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    
    onChange(dateString);
    setIsOpen(false);
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  
  // Format display value
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between bg-white transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
        } ${isOpen ? 'ring-2 ring-blue-100 border-blue-500' : 'border-gray-300'}`}
      >
        <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-500" />
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 p-4 bg-white border border-gray-200 rounded-xl shadow-xl w-[280px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-800">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              type="button"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && 
                new Date(value).getDate() === day && 
                new Date(value).getMonth() === currentDate.getMonth() && 
                new Date(value).getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDateSelect(day); }}
                  className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};