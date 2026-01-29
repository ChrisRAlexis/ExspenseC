'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Trash2, Edit, Send, Check, X, MessageSquare, Loader2, DollarSign } from 'lucide-react';

interface ExpenseActionsProps {
  expense: any;
  isOwner: boolean;
  canApprove: boolean;
  isAdmin?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'CHECK', label: 'Check' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'OTHER', label: 'Other' },
];

export function ExpenseActions({ expense, isOwner, canApprove, isAdmin }: ExpenseActionsProps) {
  const router = useRouter();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CHECK');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
      router.push('/expenses');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expense.id}/submit`, { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovalAction() {
    if (!action) return;

    setLoading(true);
    try {
      await fetch(`/api/expenses/${expense.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.toUpperCase(),
          comments,
        }),
      });
      setShowApprovalModal(false);
      setComments('');
      setAction(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to process approval:', error);
    } finally {
      setLoading(false);
    }
  }

  // Owner actions (draft expenses)
  if (isOwner && expense.status === 'DRAFT') {
    return (
      <>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(true)} className="flex-1">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => router.push(`/expenses/${expense.id}/edit`)} className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={handleSubmit} className="flex-1" loading={loading}>
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Expense"
        >
          <p className="text-slate-600 mb-6">
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={loading} className="flex-1">
              Delete
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  async function handlePayout() {
    setLoading(true);
    try {
      await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: expense.id,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: payoutNotes || null,
        }),
      });
      setShowPayoutModal(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to process payout:', error);
    } finally {
      setLoading(false);
    }
  }

  // Admin: Mark as Paid (approved expenses)
  if (isAdmin && expense.status === 'APPROVED') {
    return (
      <>
        <div className="flex gap-3">
          <Button onClick={() => setShowPayoutModal(true)} className="flex-1">
            <DollarSign className="h-4 w-4 mr-2" />
            Mark as Paid
          </Button>
        </div>

        <Modal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          title="Process Payment"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method *</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference Number</label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Check #, transaction ID, etc."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 min-h-[80px]" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPayoutModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handlePayout} loading={loading} className="flex-1">
                <Check className="h-4 w-4 mr-1" /> Confirm Payment
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // Approver actions
  if (canApprove && expense.status === 'PENDING') {
    return (
      <>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setAction('changes');
              setShowApprovalModal(true);
            }}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setAction('reject');
              setShowApprovalModal(true);
            }}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={() => {
              setAction('approve');
              setShowApprovalModal(true);
            }}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>

        <Modal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setAction(null);
            setComments('');
          }}
          title={
            action === 'approve'
              ? 'Approve Expense'
              : action === 'reject'
              ? 'Reject Expense'
              : 'Request Changes'
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Comments {action !== 'approve' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === 'approve'
                    ? 'Optional comments...'
                    : 'Please provide a reason...'
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
                required={action !== 'approve'}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalModal(false);
                  setAction(null);
                  setComments('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={action === 'reject' ? 'danger' : 'primary'}
                onClick={handleApprovalAction}
                disabled={action !== 'approve' && !comments.trim()}
                loading={loading}
                className="flex-1"
              >
                {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Request Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
