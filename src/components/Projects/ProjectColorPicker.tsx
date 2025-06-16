import React from 'react';

interface ProjectColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // yellow
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
];

export function ProjectColorPicker({ selectedColor, onSelectColor }: ProjectColorPickerProps) {
  return (
    <div className="flex space-x-2">
      {PRESET_COLORS.map((presetColor) => (
        <button
          key={presetColor}
          type="button"
          onClick={() => onSelectColor(presetColor)}
          className={`
            w-8 h-8 rounded-full border-2 transition-all
            ${selectedColor === presetColor 
              ? 'border-slate-900 scale-110' 
              : 'border-slate-300 hover:scale-105'
            }
          `}
          style={{ backgroundColor: presetColor }}
        />
      ))}
    </div>
  );
}