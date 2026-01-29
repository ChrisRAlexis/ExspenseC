'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Building2, Briefcase, ListTodo, MapPin, DollarSign,
} from 'lucide-react';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: number;
}

interface Job {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: number;
  propertyId: string;
  tasks: Task[];
}

interface Property {
  id: string;
  name: string;
  address: string | null;
  clientName: string | null;
  status: string;
  budget: number;
  jobs: Job[];
  _count?: { expenses: number };
}

export function PropertyManagement({ isAdmin }: { isAdmin: boolean }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Form state
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showJobForm, setShowJobForm] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);

  async function fetchProperties() {
    const res = await fetch('/api/admin/properties');
    const data = await res.json();
    setProperties(data);
    setLoading(false);
  }

  useEffect(() => { fetchProperties(); }, []);

  function resetForm() {
    setFormName('');
    setFormAddress('');
    setFormClient('');
    setFormBudget('');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setEditingProperty(null);
    setEditingJob(null);
    setEditingTask(null);
    setShowPropertyForm(false);
    setShowJobForm(null);
    setShowTaskForm(null);
  }

  // Property CRUD
  async function saveProperty() {
    setSaving(true);
    const url = editingProperty ? `/api/admin/properties/${editingProperty.id}` : '/api/admin/properties';
    const method = editingProperty ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        address: formAddress || null,
        clientName: formClient || null,
        budget: parseFloat(formBudget) || 0,
        status: formStatus,
      }),
    });
    resetForm();
    setSaving(false);
    fetchProperties();
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property and all its jobs/tasks?')) return;
    await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
    fetchProperties();
  }

  function startEditProperty(p: Property) {
    setEditingProperty(p);
    setFormName(p.name);
    setFormAddress(p.address || '');
    setFormClient(p.clientName || '');
    setFormBudget(p.budget.toString());
    setFormStatus(p.status);
    setShowPropertyForm(true);
  }

  // Job CRUD
  async function saveJob(propertyId: string) {
    setSaving(true);
    const url = editingJob ? `/api/admin/jobs/${editingJob.id}` : `/api/admin/properties/${propertyId}/jobs`;
    const method = editingJob ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        description: formDescription || null,
        budget: parseFloat(formBudget) || 0,
        status: formStatus,
      }),
    });
    resetForm();
    setSaving(false);
    fetchProperties();
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this job and all its tasks?')) return;
    await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
    fetchProperties();
  }

  function startEditJob(j: Job) {
    setEditingJob(j);
    setFormName(j.name);
    setFormDescription(j.description || '');
    setFormBudget(j.budget.toString());
    setFormStatus(j.status);
    setShowJobForm(j.propertyId);
  }

  // Task CRUD
  async function saveTask(jobId: string) {
    setSaving(true);
    const url = editingTask ? `/api/admin/tasks/${editingTask.id}` : `/api/admin/jobs/${jobId}/tasks`;
    const method = editingTask ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        description: formDescription || null,
        budget: parseFloat(formBudget) || 0,
        status: formStatus,
      }),
    });
    resetForm();
    setSaving(false);
    fetchProperties();
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
    fetchProperties();
  }

  function startEditTask(t: Task) {
    setEditingTask(t);
    setFormName(t.name);
    setFormDescription(t.description || '');
    setFormBudget(t.budget.toString());
    setFormStatus(t.status);
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    ON_HOLD: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Properties & Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Manage construction properties, jobs, and tasks</p>
        </div>
        <Button onClick={() => { resetForm(); setShowPropertyForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Property Form */}
      {showPropertyForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-700 mb-4">
              {editingProperty ? 'Edit Property' : 'New Property'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Property Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 123 Main St Renovation"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Client Name</label>
                <input type="text" value={formClient} onChange={(e) => setFormClient(e.target.value)}
                  placeholder="Client name"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Address</label>
                <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Budget</label>
                <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={saveProperty} loading={saving} disabled={!formName.trim()}>
                {editingProperty ? 'Update Property' : 'Create Property'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Properties List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading properties...</div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            No properties yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardContent className="p-0">
                {/* Property Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
                >
                  {expandedProperty === property.id ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                  <div className="p-2 bg-emerald-100/50 rounded-xl">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-700 truncate">{property.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                        {property.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-0.5">
                      {property.address && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{property.address}</span>
                      )}
                      {property.clientName && <span>Client: {property.clientName}</span>}
                      <span>{property.jobs.length} jobs</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-600">{formatCurrency(property.budget)}</p>
                    <p className="text-xs text-slate-400">budget</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEditProperty(property)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteProperty(property.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Jobs */}
                {expandedProperty === property.id && (
                  <div className="border-t border-slate-100 pl-12 pr-4 pb-4">
                    {/* Add Job Button */}
                    <button
                      onClick={() => { resetForm(); setShowJobForm(property.id); }}
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 py-3"
                    >
                      <Plus className="h-4 w-4" /> Add Job
                    </button>

                    {/* Job Form */}
                    {showJobForm === property.id && !editingJob && (
                      <div className="bg-slate-50/50 rounded-xl p-4 mb-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                            placeholder="Job name *" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                          <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Description" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                          <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}
                            placeholder="Budget" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveJob(property.id)} loading={saving} disabled={!formName.trim()}>Create Job</Button>
                          <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Job Edit Form */}
                    {showJobForm === property.id && editingJob && (
                      <div className="bg-slate-50/50 rounded-xl p-4 mb-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                            placeholder="Job name *" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                          <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Description" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                          <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}
                            placeholder="Budget" className="text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveJob(property.id)} loading={saving}>Update Job</Button>
                          <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Jobs List */}
                    {property.jobs.map((job) => (
                      <div key={job.id} className="border-b border-slate-100 last:border-0">
                        <div
                          className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50/30 rounded-lg px-2 transition-colors"
                          onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        >
                          {expandedJob === job.id ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <Briefcase className="h-4 w-4 text-amber-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-700">{job.name}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[job.status]}`}>
                              {job.status}
                            </span>
                            {job.description && <p className="text-xs text-slate-400 mt-0.5">{job.description}</p>}
                          </div>
                          <span className="text-sm text-slate-500">{formatCurrency(job.budget)}</span>
                          <span className="text-xs text-slate-400">{job.tasks.length} tasks</span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => startEditJob(job)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => deleteJob(job.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded: Tasks */}
                        {expandedJob === job.id && (
                          <div className="pl-10 pb-3">
                            <button
                              onClick={() => { resetForm(); setShowTaskForm(job.id); }}
                              className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 py-2"
                            >
                              <Plus className="h-3 w-3" /> Add Task
                            </button>

                            {showTaskForm === job.id && (
                              <div className="bg-slate-50/50 rounded-lg p-3 mb-2 space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Task name *" className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Description" className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                  <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}
                                    placeholder="Budget" className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveTask(job.id)} loading={saving} disabled={!formName.trim()}>
                                    {editingTask ? 'Update' : 'Create'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                                </div>
                              </div>
                            )}

                            {job.tasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-2 py-2 px-2 hover:bg-slate-50/30 rounded-lg">
                                <ListTodo className="h-3.5 w-3.5 text-violet-500" />
                                <span className="text-xs font-medium text-slate-600 flex-1">{task.name}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[task.status]}`}>
                                  {task.status}
                                </span>
                                <span className="text-xs text-slate-400">{formatCurrency(task.budget)}</span>
                                <button onClick={() => { startEditTask(task); setShowTaskForm(job.id); }} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => deleteTask(task.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {job.tasks.length === 0 && (
                              <p className="text-xs text-slate-400 py-2 pl-2">No tasks yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {property.jobs.length === 0 && (
                      <p className="text-sm text-slate-400 py-3">No jobs yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
