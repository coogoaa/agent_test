import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface AutocompleteProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  placeholder = "Type to search or enter custom name...",
  label,
  error,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type="text"
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors shadow-sm ${
            error ? 'border-red-500 focus:ring-red-100' : 'border-gray-300'
          }`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      
      {error && <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
        <span>{error}</span>
      </div>}

      {isOpen && (value.length > 0 || filteredOptions.length > 0) && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 text-gray-700 flex items-center justify-between transition-colors border-b border-gray-50 last:border-0"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                <span>{opt}</span>
                {value === opt && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic bg-gray-50">
              "{value}" will be added as a new installer
            </div>
          )}
        </div>
      )}
    </div>
  );
};