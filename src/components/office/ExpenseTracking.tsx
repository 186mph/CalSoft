import React, { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Eye, Download, Search, FileDown, Check, X, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExpenseFormData {
  amount: string;
  date: string;
  category: string;
  paymentMethod: string;
  vendor: string;
  notes: string;
  receipt?: File | null;
  department: string;
}

interface Expense extends Omit<ExpenseFormData, 'amount'> {
  id: string;
  amount: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

const expenseCategories = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals & Entertainment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent & Facilities' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'other', label: 'Other' }
];

const paymentMethods = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'other', label: 'Other' }
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
};

const departments = [
  { value: 'sales', label: 'Sales' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
];

export default function ExpenseTracking() {
  const [showForm, setShowForm] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]); // Will be replaced with API data
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Expense;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const defaultFormState: ExpenseFormData = {
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'office_supplies',
    paymentMethod: 'credit_card',
    vendor: '',
    notes: '',
    receipt: null,
    department: 'operations'
  };

  const [form, setForm] = useState<ExpenseFormData>(defaultFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulating API call
      const newExpense: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        amount: parseFloat(form.amount),
        date: form.date,
        category: form.category,
        paymentMethod: form.paymentMethod,
        vendor: form.vendor,
        notes: form.notes,
        createdAt: new Date().toISOString(),
        status: 'pending',
        receiptUrl: form.receipt ? URL.createObjectURL(form.receipt) : undefined,
        department: form.department
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      setForm(defaultFormState);
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) {
      setForm(prev => ({ ...prev, receipt: file }));
    }
  };

  const handleSort = (key: keyof Expense) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleApprove = async (expense: Expense) => {
    try {
      const updatedExpense: Expense = {
        ...expense,
        status: 'approved' as const,
        approvedBy: 'Current User', // Replace with actual user
        approvedAt: new Date().toISOString()
      };
      
      setExpenses(prev => 
        prev.map(e => e.id === expense.id ? updatedExpense : e)
      );
      setShowApprovalDialog(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleReject = async (expense: Expense) => {
    try {
      const updatedExpense: Expense = {
        ...expense,
        status: 'rejected' as const,
        rejectionReason
      };
      
      setExpenses(prev => 
        prev.map(e => e.id === expense.id ? updatedExpense : e)
      );
      setShowApprovalDialog(false);
      setSelectedExpense(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Vendor', 'Category', 'Department', 'Amount', 'Status', 'Notes'];
    const data = filteredAndSortedExpenses.map(expense => [
      format(new Date(expense.date), 'yyyy-MM-dd'),
      expense.vendor,
      expenseCategories.find(c => c.value === expense.category)?.label ?? expense.category,
      departments.find(d => d.value === expense.department)?.label ?? expense.department,
      expense.amount.toFixed(2),
      expense.status,
      expense.notes
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Expense Report', 14, 20);
    
    // Add filters summary
    doc.setFontSize(10);
    let yPos = 30;
    if (filterDateFrom || filterDateTo) {
      const dateRange = `Date Range: ${filterDateFrom || 'Any'} to ${filterDateTo || 'Any'}`;
      doc.text(dateRange, 14, yPos);
      yPos += 6;
    }
    if (filterCategory) {
      const category = `Category: ${expenseCategories.find(c => c.value === filterCategory)?.label || filterCategory}`;
      doc.text(category, 14, yPos);
      yPos += 6;
    }
    if (filterDepartment) {
      const department = `Department: ${departments.find(d => d.value === filterDepartment)?.label || filterDepartment}`;
      doc.text(department, 14, yPos);
      yPos += 6;
    }
    if (filterStatus) {
      const status = `Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`;
      doc.text(status, 14, yPos);
      yPos += 6;
    }

    // Add generation date
    const generatedDate = `Generated on: ${format(new Date(), 'MMM d, yyyy HH:mm')}`;
    doc.text(generatedDate, 14, yPos);
    yPos += 10;

    // Calculate totals
    const totalAmount = filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalByStatus = filteredAndSortedExpenses.reduce((acc, expense) => {
      acc[expense.status] = (acc[expense.status] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Add summary section
    doc.setFontSize(12);
    doc.text('Summary', 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPos);
    yPos += 6;
    Object.entries(totalByStatus).forEach(([status, amount]) => {
      doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: $${amount.toFixed(2)}`, 14, yPos);
      yPos += 6;
    });
    yPos += 6;

    // Add expense table
    const headers = [
      ['Date', 'Vendor', 'Category', 'Department', 'Amount', 'Status', 'Notes']
    ];

    const data = filteredAndSortedExpenses.map(expense => [
      format(new Date(expense.date), 'MMM d, yyyy'),
      expense.vendor,
      expenseCategories.find(c => c.value === expense.category)?.label ?? expense.category,
      departments.find(d => d.value === expense.department)?.label ?? expense.department,
      `$${expense.amount.toFixed(2)}`,
      expense.status.charAt(0).toUpperCase() + expense.status.slice(1),
      expense.notes
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 30 }, // Vendor
        2: { cellWidth: 25 }, // Category
        3: { cellWidth: 25 }, // Department
        4: { cellWidth: 20 }, // Amount
        5: { cellWidth: 20 }, // Status
        6: { cellWidth: 'auto' } // Notes
      },
      margin: { top: 10 },
      didDrawPage: (data: any) => {
        // Add page number at the bottom
        const pageNumber = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(pageNumber, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
      }
    });

    // Save the PDF
    doc.save(`expense_report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  };

  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      const matchesSearch = searchTerm === '' || 
        expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.notes.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === '' || expense.category === filterCategory;
      const matchesStatus = filterStatus === '' || expense.status === filterStatus;
      const matchesDepartment = filterDepartment === '' || expense.department === filterDepartment;
      
      const expenseDate = new Date(expense.date);
      const matchesDateFrom = !filterDateFrom || expenseDate >= new Date(filterDateFrom);
      const matchesDateTo = !filterDateTo || expenseDate <= new Date(filterDateTo);
      
      return matchesSearch && matchesCategory && matchesStatus && 
             matchesDepartment && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      const aValue = a[key];
      const bValue = b[key];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Tracking</h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={generatePDFReport}>
                Generate PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowForm(true)}>
            Add Expense
          </Button>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  step="0.01"
                  label="Amount ($)*"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <Input
                  type="date"
                  label="Date*"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Select
                  label="Category*"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  options={expenseCategories}
                  required
                />
              </div>

              <div>
                <Select
                  label="Payment Method*"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  options={paymentMethods}
                  required
                />
              </div>

              <div>
                <Input
                  label="Vendor*"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  required
                  placeholder="Vendor name"
                />
              </div>

              <div>
                <Input
                  type="file"
                  label="Receipt"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <Select
                  label="Department*"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  options={departments}
                  required
                />
              </div>
            </div>

            <div>
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional details about the expense..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Expense</DialogTitle>
            <DialogDescription>
              Review and approve or reject this expense request.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Amount</label>
                  <p>${selectedExpense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="font-medium">Date</label>
                  <p>{format(new Date(selectedExpense.date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <label className="font-medium">Vendor</label>
                  <p>{selectedExpense.vendor}</p>
                </div>
                <div>
                  <label className="font-medium">Category</label>
                  <p>{expenseCategories.find(c => c.value === selectedExpense.category)?.label}</p>
                </div>
              </div>
              
              {selectedExpense.status === 'pending' && (
                <div className="space-y-4">
                  <Textarea
                    label="Rejection Reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection (required for rejecting)"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowApprovalDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => selectedExpense && handleReject(selectedExpense)}
                      disabled={!rejectionReason}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => selectedExpense && handleApprove(selectedExpense)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      className="pl-9"
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...expenseCategories
                  ]}
                  className="w-40"
                />
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  className="w-40"
                />
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...departments
                  ]}
                  className="w-40"
                />
              </div>
              <div className="flex gap-4">
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  label="From Date"
                />
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  label="To Date"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('vendor')}
                    >
                      Vendor {sortConfig.key === 'vendor' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('category')}
                    >
                      Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => handleSort('amount')}
                    >
                      Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{expense.vendor}</TableCell>
                        <TableCell>
                          {expenseCategories.find(c => c.value === expense.category)?.label}
                        </TableCell>
                        <TableCell>
                          {departments.find(d => d.value === expense.department)?.label}
                        </TableCell>
                        <TableCell className="text-right">
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[expense.status]}`}>
                            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowApprovalDialog(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            {expense.receiptUrl && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(expense.receiptUrl)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = expense.receiptUrl!;
                                    link.download = `receipt-${expense.id}`;
                                    link.click();
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}