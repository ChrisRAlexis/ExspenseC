'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Edit, Shield, User as UserIcon, Users, ChevronUp, DollarSign } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  createdAt: Date;
  managerId: string | null;
  managerName: string | null;
  directReportsCount: number;
  totalExpenseAmount: number;
  pendingCount: number;
  approvedCount: number;
  _count: {
    expenses: number;
  };
}

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'ADMIN', label: 'Admin' },
];

const roleColors: Record<string, 'default' | 'pending' | 'approved'> = {
  EMPLOYEE: 'default',
  APPROVER: 'pending',
  ADMIN: 'approved',
};

const roleIcons: Record<string, typeof Shield> = {
  ADMIN: Shield,
  APPROVER: Users,
  EMPLOYEE: UserIcon,
};

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);

  async function updateUserRole() {
    if (!selectedUser || !newRole) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, role: newRole } : u
          )
        );
        setSelectedUser(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Role</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Department</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Reports To</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Team</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Expenses</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Total Amount</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const RoleIcon = roleIcons[user.role] || UserIcon;
              return (
                <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-600'
                          : user.role === 'APPROVER'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className="text-sm font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className={`h-3.5 w-3.5 ${
                        user.role === 'ADMIN'
                          ? 'text-purple-500'
                          : user.role === 'APPROVER'
                          ? 'text-amber-500'
                          : 'text-slate-400'
                      }`} />
                      <Badge variant={roleColors[user.role]}>{user.role}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 text-sm">{user.department || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.managerName ? (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <ChevronUp className="h-3 w-3 text-slate-400" />
                        {user.managerName}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.directReportsCount > 0 ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-sm font-medium text-slate-900">{user.directReportsCount}</span>
                        <span className="text-xs text-slate-400">reports</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-slate-900">{user._count.expenses}</span>
                      {user.pendingCount > 0 && (
                        <span className="text-xs text-amber-600">{user.pendingCount} pending</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.totalExpenseAmount > 0 ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(user.totalExpenseAmount)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Edit User Role"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="font-medium text-slate-600">
                  {selectedUser.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
            </div>

            <Select
              label="Role"
              options={roleOptions}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />

            <div className="text-sm text-slate-500 space-y-1">
              <p><strong>Employee:</strong> Can submit expenses</p>
              <p><strong>Approver:</strong> Can approve expenses</p>
              <p><strong>Admin:</strong> Full access including user management</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedUser(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={updateUserRole} loading={loading} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
