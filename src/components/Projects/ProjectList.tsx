import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProjects } from '../../hooks/useDatabase';
import { Project } from '../../types';
import { Button } from '../UI/Button';
import { GradientText } from '../UI/GradientText';
import { ConfirmationModal } from '../UI/ConfirmationModal';
import { ProjectItem } from './ProjectItem';
import { ProjectModal } from './ProjectModal';

interface ProjectListProps {
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
}

export function ProjectList({ selectedProjectId, onSelectProject }: ProjectListProps) {
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleCreateProject = async (name: string, description?: string, color?: string) => {
    await createProject(name, description, color);
    setIsModalOpen(false);
  };

  const handleUpdateProject = async (id: string, name: string, description?: string, color?: string) => {
    await updateProject(id, { name, description, color });
    setEditingProject(null);
  };

  const handleDeleteProject = async (project: Project) => {
    if (project.isDefault) return;
    setDeletingProject(project);
  };

  const confirmDeleteProject = async () => {
    if (deletingProject) {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">
          <GradientText from="orange-600" to="pink-600">
            📁 Projects
          </GradientText>
        </h2>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => setIsModalOpen(true)}
          className="shadow-lg"
        >
          New Project
        </Button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelect={onSelectProject}
            onDelete={handleDeleteProject}
            onEdit={setEditingProject}
          />
        ))}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateProject}
        title="Create New Project"
      />

      {editingProject && (
        <ProjectModal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          onSave={(name, description, color) => handleUpdateProject(editingProject.id, name, description, color)}
          title="Edit Project"
          initialData={editingProject}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? All chats will be moved to the General project.`}
        confirmText="Delete Project"
        variant="danger"
      />
    </div>
  );
}