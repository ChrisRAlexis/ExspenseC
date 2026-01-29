'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, TrendingUp, AlertTriangle, Building2,
  Briefcase, ListTodo, ChevronDown, ChevronRight,
} from 'lucide-react';

interface TaskSummary {
  id: string;
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: string;
}

interface JobSummary {
  id: string;
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: string;
  tasks: TaskSummary[];
}

interface PropertySummary {
  id: string;
  name: string;
  address: string | null;
  clientName: string | null;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: string;
  jobs: JobSummary[];
}

interface BudgetData {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  properties: PropertySummary[];
}

function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' }) {
  const color = percent > 100 ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-emerald-500';
  const bgColor = percent > 100 ? 'bg-red-100' : percent > 80 ? 'bg-yellow-100' : 'bg-emerald-100';
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`w-full ${bgColor} rounded-full ${h}`}>
      <div className={`${color} ${h} rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

export function BudgetOverview({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/budget')
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading budget data...</div>;
  if (!data) return <div className="text-center py-12 text-slate-400">Failed to load budget data</div>;

  const overBudget = data.properties.filter((p) => p.percentUsed > 100);
  const nearBudget = data.properties.filter((p) => p.percentUsed > 80 && p.percentUsed <= 100);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Budget Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Track spending across all properties and jobs</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100/50 rounded-xl">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Budget</p>
                <p className="text-lg font-bold text-slate-700">{formatCurrency(data.totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100/50 rounded-xl">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Spent</p>
                <p className="text-lg font-bold text-slate-700">{formatCurrency(data.totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100/50 rounded-xl">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Remaining</p>
                <p className={`text-lg font-bold ${data.totalRemaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatCurrency(data.totalRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${overBudget.length > 0 ? 'bg-red-100/50' : nearBudget.length > 0 ? 'bg-yellow-100/50' : 'bg-emerald-100/50'}`}>
                <AlertTriangle className={`h-5 w-5 ${overBudget.length > 0 ? 'text-red-600' : nearBudget.length > 0 ? 'text-yellow-600' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Alerts</p>
                <p className="text-lg font-bold text-slate-700">{overBudget.length + nearBudget.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Overall Budget Usage</span>
            <span className="text-sm font-semibold text-slate-700">{data.percentUsed.toFixed(1)}%</span>
          </div>
          <ProgressBar percent={data.percentUsed} />
        </CardContent>
      </Card>

      {/* Property Breakdown */}
      <div className="space-y-4">
        {data.properties.map((property) => (
          <Card key={property.id}>
            <CardContent className="p-0">
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
                    <h3 className="font-semibold text-slate-700">{property.name}</h3>
                    {property.percentUsed > 100 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Over Budget</span>
                    )}
                    {property.percentUsed > 80 && property.percentUsed <= 100 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Near Limit</span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar percent={property.percentUsed} size="sm" />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-600">
                    {formatCurrency(property.spent)} / {formatCurrency(property.budget)}
                  </p>
                  <p className="text-xs text-slate-400">{property.percentUsed.toFixed(1)}% used</p>
                </div>
              </div>

              {expandedProperty === property.id && (
                <div className="border-t border-slate-100 pl-12 pr-4 pb-4">
                  {property.jobs.map((job) => (
                    <div key={job.id} className="border-b border-slate-100 last:border-0">
                      <div
                        className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50/30 rounded-lg px-2"
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
                          <div className="mt-1">
                            <ProgressBar percent={job.percentUsed} size="sm" />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-slate-600">
                            {formatCurrency(job.spent)} / {formatCurrency(job.budget)}
                          </p>
                          <p className="text-xs text-slate-400">{job.percentUsed.toFixed(1)}%</p>
                        </div>
                      </div>

                      {expandedJob === job.id && job.tasks.length > 0 && (
                        <div className="pl-10 pb-2">
                          {job.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-2 px-2">
                              <ListTodo className="h-3.5 w-3.5 text-violet-500" />
                              <span className="text-xs font-medium text-slate-600 flex-1">{task.name}</span>
                              <div className="w-24">
                                <ProgressBar percent={task.percentUsed} size="sm" />
                              </div>
                              <span className="text-xs text-slate-400 w-32 text-right">
                                {formatCurrency(task.spent)} / {formatCurrency(task.budget)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {property.jobs.length === 0 && (
                    <p className="text-sm text-slate-400 py-3">No jobs</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
