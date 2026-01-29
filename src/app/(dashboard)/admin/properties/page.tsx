import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PropertyManagement } from './property-management';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER')) redirect('/dashboard');
  return <PropertyManagement isAdmin={session.user.role === 'ADMIN'} />;
}
