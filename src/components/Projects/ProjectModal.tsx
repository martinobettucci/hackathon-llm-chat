import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { Input } from '../UI/Input';
import { Button } from '../UI/Button';
import { GradientText } from '../UI/GradientText';
import { ProjectColorPicker } from './ProjectColorPicker';
import { Project } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, color?: string) => void;
  title: string;
  initialData?: Project;
}

export function ProjectModal({ isOpen, onClose, onSave, title, initialData }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setColor(initialData.color || '#3B82F6');
    } else {
      setName('');
      setDescription('');
      setColor('#3B82F6');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined, color);
      setName('');
      setDescription('');
      setColor('#3B82F6');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          required
        />

        <div className="space-y-1">
          <label className="block text-sm font-semibold">
            <GradientText from="teal-700" to="purple-700">
              Description (optional)
            </GradientText>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter project description"
            rows={3}
            className="
              block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm
              placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
              bg-gradient-to-r from-white to-cyan-25 text-gray-800 font-medium
              transition-all duration-200 hover:shadow-md
            "
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold">
            <GradientText from="teal-700" to="purple-700">
              Color
            </GradientText>
          </label>
          <ProjectColorPicker
            selectedColor={color}
            onSelectColor={setColor}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {initialData ? 'Update' : 'Create'} Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}