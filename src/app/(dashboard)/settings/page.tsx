'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Building, Mail, Shield } from 'lucide-react';

const departments = [
  { value: '', label: 'Not assigned' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'other', label: 'Other' },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(session?.user?.name || '');
  const [department, setDepartment] = useState(session?.user?.department || '');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department }),
      });

      if (res.ok) {
        await update({ name, department });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {session.user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{session.user.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    session.user.role === 'ADMIN'
                      ? 'approved'
                      : session.user.role === 'APPROVER'
                      ? 'pending'
                      : 'default'
                  }
                >
                  {session.user.role}
                </Badge>
                {session.user.department && (
                  <span className="text-sm text-slate-500">{session.user.department}</span>
                )}
              </div>
            </div>
          </div>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="h-4 w-4" />}
          />

          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-lg">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">{session.user.email}</span>
          </div>

          <Select
            label="Department"
            options={departments}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <Button onClick={handleSave} loading={loading} className="w-full">
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Role Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {session.user.role === 'ADMIN' && (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can submit expenses
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can approve all expenses
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can manage users
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can configure workflows
                </div>
              </>
            )}
            {session.user.role === 'APPROVER' && (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can submit expenses
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can approve assigned expenses
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  Cannot manage users
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  Cannot configure workflows
                </div>
              </>
            )}
            {session.user.role === 'EMPLOYEE' && (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Can submit expenses
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  Cannot approve expenses
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  Cannot manage users
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="py-4">
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-red-600 hover:bg-red-50 border-red-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
