import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
  className?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  hint,
  className = ''
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
          {label}
        </label>
        <span className="text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
          {value.toFixed(2)}{unit}
        </span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="
            w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus:ring-4 focus:ring-teal-200
            slider-thumb
          "
          style={{
            background: `linear-gradient(to right, 
              #10b981 0%, 
              #10b981 ${percentage}%, 
              #e5e7eb ${percentage}%, 
              #e5e7eb 100%)`
          }}
        />
        
        {/* Value indicators */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min}{unit}</span>
          <span className="text-teal-600 font-medium">Current: {value.toFixed(2)}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
      
      {hint && (
        <p className="text-sm text-gray-600 font-medium mt-2">
          {hint}
        </p>
      )}
      
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #06b6d4);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #06b6d4);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}