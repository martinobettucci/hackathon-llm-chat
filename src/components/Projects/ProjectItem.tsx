import React from 'react';
import { Folder, FolderOpen, Edit3, Trash2 } from 'lucide-react';
import { Project } from '../../types';
import { Button } from '../UI/Button';

interface ProjectItemProps {
  project: Project;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  onDelete: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export function ProjectItem({ project, isSelected, onSelect, onDelete, onEdit }: ProjectItemProps) {
  return (
    <div
      className={`
        group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg border-2
        ${isSelected
          ? 'bg-gradient-to-r from-orange-100 to-pink-100 border-orange-300 text-orange-800 transform scale-105'
          : 'bg-white border-gray-200 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 hover:border-orange-300 text-gray-700'
        }
      `}
      onClick={() => onSelect(project.id)}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {isSelected ? (
          <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: project.color }} />
        ) : (
          <Folder className="w-5 h-5 flex-shrink-0" style={{ color: project.color }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{project.name}</p>
          {project.description && (
            <p className="text-xs opacity-75 truncate">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Edit3}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          className="h-8 px-3"
          title="Edit project"
        >
          Edit
        </Button>
        {!project.isDefault && (
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project);
            }}
            className="h-8 px-3"
            title="Delete project"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}