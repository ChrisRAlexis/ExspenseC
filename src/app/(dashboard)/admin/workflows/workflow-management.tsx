'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Edit, Users } from 'lucide-react';

interface Approver {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface WorkflowStep {
  id: string;
  approverId: string | null;
  stepOrder: number;
  approver: { name: string; email: string } | null;
}

interface Workflow {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  conditions: string | null;
  steps: WorkflowStep[];
  _count: { expenses: number };
}

interface Props {
  initialWorkflows: Workflow[];
  approvers: Approver[];
}

const workflowTypes = [
  { value: 'SEQUENTIAL', label: 'Sequential (one after another)' },
  { value: 'PARALLEL', label: 'Parallel (all at once)' },
];

const categories = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'LODGING', label: 'Lodging' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'OTHER', label: 'Other' },
];

export function WorkflowManagement({ initialWorkflows, approvers }: Props) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SEQUENTIAL',
    minAmount: '',
    maxAmount: '',
    departments: [] as string[],
    categories: [] as string[],
    steps: [] as { approverId: string; order: number }[],
  });

  function resetForm() {
    setFormData({
      name: '',
      type: 'SEQUENTIAL',
      minAmount: '',
      maxAmount: '',
      departments: [],
      categories: [],
      steps: [],
    });
    setEditingWorkflow(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(workflow: Workflow) {
    const conditions = workflow.conditions ? JSON.parse(workflow.conditions) : {};
    setFormData({
      name: workflow.name,
      type: workflow.type,
      minAmount: conditions.minAmount?.toString() || '',
      maxAmount: conditions.maxAmount?.toString() || '',
      departments: conditions.departments || [],
      categories: conditions.categories || [],
      steps: workflow.steps.filter((s) => s.approverId).map((s) => ({ approverId: s.approverId!, order: s.stepOrder })),
    });
    setEditingWorkflow(workflow);
    setShowModal(true);
  }

  function addStep() {
    if (approvers.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { approverId: approvers[0].id, order: prev.steps.length }],
    }));
  }

  function removeStep(index: number) {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    }));
  }

  function updateStep(index: number, approverId: string) {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, approverId } : s)),
    }));
  }

  async function handleSubmit() {
    if (!formData.name || formData.steps.length === 0) return;

    setLoading(true);
    try {
      const conditions: any = {};
      if (formData.minAmount) conditions.minAmount = parseFloat(formData.minAmount);
      if (formData.maxAmount) conditions.maxAmount = parseFloat(formData.maxAmount);
      if (formData.departments.length > 0) conditions.departments = formData.departments;
      if (formData.categories.length > 0) conditions.categories = formData.categories;

      const payload = {
        name: formData.name,
        type: formData.type,
        conditions: Object.keys(conditions).length > 0 ? JSON.stringify(conditions) : null,
        steps: formData.steps,
      };

      const url = editingWorkflow
        ? `/api/admin/workflows/${editingWorkflow.id}`
        : '/api/admin/workflows';
      const method = editingWorkflow ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        router.refresh();
        // Refresh workflows list
        const data = await res.json();
        if (editingWorkflow) {
          setWorkflows((prev) =>
            prev.map((w) => (w.id === editingWorkflow.id ? data.workflow : w))
          );
        } else {
          setWorkflows((prev) => [data.workflow, ...prev]);
        }
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const res = await fetch(`/api/admin/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  }

  async function toggleWorkflow(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? { ...w, isActive: !isActive } : w))
        );
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>

        {workflows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No workflows configured</p>
            <p className="text-sm">Create a workflow to define approval chains</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{workflow.name}</h3>
                      <Badge variant={workflow.isActive ? 'approved' : 'draft'}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="default">{workflow.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {workflow.steps.length} approver{workflow.steps.length !== 1 ? 's' : ''} ·{' '}
                      {workflow._count.expenses} expense{workflow._count.expenses !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {workflow.steps.map((step, i) => (
                        <span
                          key={step.id}
                          className="text-xs bg-slate-100 px-2 py-1 rounded"
                        >
                          {i + 1}. {step.approver?.name || 'Manager'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWorkflow(workflow.id, workflow.isActive)}
                    >
                      {workflow.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(workflow)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Workflow Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Standard Approval"
          />

          <Select
            label="Workflow Type"
            options={workflowTypes}
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Amount ($)"
              type="number"
              value={formData.minAmount}
              onChange={(e) => setFormData((prev) => ({ ...prev, minAmount: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Max Amount ($)"
              type="number"
              value={formData.maxAmount}
              onChange={(e) => setFormData((prev) => ({ ...prev, maxAmount: e.target.value }))}
              placeholder="No limit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Approvers {formData.type === 'SEQUENTIAL' && '(in order)'}
            </label>
            <div className="space-y-2">
              {formData.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500 w-6">{index + 1}.</span>
                  <select
                    value={step.approverId}
                    onChange={(e) => updateStep(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {approvers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add Approver
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!formData.name || formData.steps.length === 0}
              className="flex-1"
            >
              {editingWorkflow ? 'Save Changes' : 'Create Workflow'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
