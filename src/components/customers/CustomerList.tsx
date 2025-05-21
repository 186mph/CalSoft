import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Filter, Tag } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { 
  Customer, 
  CustomerCategory, 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  getCategories
} from '../../services/customerService';

interface CustomerFormData {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  category_id: string | null;
}

const initialFormData: CustomerFormData = {
  company_name: '',
  email: '',
  phone: '',
  address: '',
  category_id: null,
};

export default function CustomerList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    category_id?: string | null;
    status?: string | null;
  }>({});

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeFilters]);

  async function fetchData() {
    try {
      setLoading(true);
      console.log("CustomerList: Fetching data with activeFilters:", activeFilters);
      
      // Get customers from common schema
      const customersData = await getCustomers(activeFilters);
      console.log(`CustomerList: Retrieved ${customersData.length} customers from common schema`);
      
      // Get categories
      const categoriesData = await getCategories();
      console.log(`CustomerList: Retrieved ${categoriesData.length} categories`);
      
      setCustomers(customersData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('CustomerList: Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!user) return;
      
      setFormLoading(true);

      const dataToSave = {
        ...formData,
        name: formData.company_name // Set name to be the same as company_name
      };
      
      if (isEditing && customerToEdit) {
        // Update existing customer
        await updateCustomer(customerToEdit, dataToSave);
      } else {
        // Create new customer
        await createCustomer({ 
          ...dataToSave, 
          status: 'active',
          user_id: user.id 
        });
      }
      
      setIsOpen(false);
      setFormData(initialFormData);
      setIsEditing(false);
      setCustomerToEdit(null);
      fetchData();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(customerId: string) {
    try {
      await deleteCustomer(customerId);
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'category_id' ? (value || null) : value 
    }));
  }

  function confirmDelete(customerId: string) {
    setCustomerToDelete(customerId);
    setDeleteConfirmOpen(true);
  }

  function handleEdit(customer: Customer, e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
    setCustomerToEdit(customer.id);
    setFormData({
      company_name: customer.company_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      category_id: customer.category_id || null
    });
    setIsOpen(true);
  }

  const handleRowClick = (customerId: string) => {
    const currentPath = location.pathname;
    let targetPath = '';

    if (currentPath.startsWith('/sales-dashboard')) {
      targetPath = `/sales-dashboard/customers/${customerId}`;
    } else {
      // Check if we are in a division context (e.g., /north_alabama/customers)
      const pathParts = currentPath.split('/').filter(part => part !== ''); // filter empty strings
      if (pathParts.length >= 2 && pathParts[1] === 'customers') {
        const division = pathParts[0];
        targetPath = `/${division}/customers/${customerId}`;
      } else {
        // Fallback or default behavior if context is unclear (shouldn't happen with current routes)
        console.warn(`[CustomerList] Unclear navigation context from path: ${currentPath}. Falling back to generic path.`);
        targetPath = `/customers/${customerId}`; // This path might not exist anymore, leading to redirect
      }
    }
      
    console.log(`[CustomerList] handleRowClick: Current Path = ${currentPath}, Target Path = ${targetPath}`);
    navigate(targetPath);
  };

  function handleFilterChange(type: 'category_id' | 'status', value: string | null) {
    setActiveFilters(prev => ({
      ...prev,
      [type]: value
    }));
  }

  function clearFilters() {
    setActiveFilters({});
    setFilterOpen(false);
  }

  function getCategoryNameById(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  }

  function getCategoryColorById(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : null;
  }

  function navigateToCategoriesPage() {
    const currentPath = location.pathname;

    if (currentPath.startsWith('/sales-dashboard')) {
      navigate('/sales-dashboard/customer-categories');
    } else {
      // Check if we are in a division context (e.g., /north_alabama/customers)
      const pathParts = currentPath.split('/').filter(part => part !== ''); // filter empty strings
      if (pathParts.length >= 2 && pathParts[1] === 'customers') {
        const division = pathParts[0];
        navigate(`/${division}/customer-categories`);
      } else {
        // Fallback to sales dashboard path if context is unclear
        navigate('/sales-dashboard/customer-categories');
      }
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading...</div>;
  }

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'customer', label: 'Customer' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customers</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Manage your customer accounts and view their details.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/sales-dashboard/customer-categories"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <Tag className="h-4 w-4 mr-2" />
            Categories
          </Link>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 rounded-full bg-[#f26722] w-5 h-5 flex items-center justify-center text-xs text-white">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setCustomerToEdit(null);
              setFormData(initialFormData);
              setIsOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#f26722] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add customer
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
            
            {activeFilters.category_id && (
              <div className="flex items-center bg-white dark:bg-gray-600 rounded-full px-3 py-1 text-sm">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: getCategoryColorById(activeFilters.category_id) || '#ccc' }}
                />
                <span className="mr-1">Category: {getCategoryNameById(activeFilters.category_id)}</span>
                <button 
                  onClick={() => handleFilterChange('category_id', null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {activeFilters.status && (
              <div className="flex items-center bg-white dark:bg-gray-600 rounded-full px-3 py-1 text-sm">
                <span className="mr-1">Status: {activeFilters.status}</span>
                <button 
                  onClick={() => handleFilterChange('status', null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <button 
              onClick={clearFilters}
              className="text-sm text-[#f26722] hover:text-[#f26722]/80"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {customers.length === 0 ? (
            <li className="px-6 py-4">
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You don't have any customers yet. Get started by adding your first customer.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setCustomerToEdit(null);
                      setFormData(initialFormData);
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#f26722] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2 sm:w-auto"
                  >
                    Add your first customer
                  </button>
                </div>
              </div>
            </li>
          ) : (
            customers.map(customer => (
              <li 
                key={customer.id}
                onClick={() => handleRowClick(customer.id)}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                          {customer.company_name?.charAt(0) || 'C'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.company_name}
                        {customer.category_id && categories.length > 0 && (
                          <span 
                            className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: (getCategoryColorById(customer.category_id) + '20') as string,
                              color: getCategoryColorById(customer.category_id) as string 
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: getCategoryColorById(customer.category_id) as string }}
                            ></div>
                            {getCategoryNameById(customer.category_id)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : customer.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        : customer.status === 'lead'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : customer.status === 'prospect'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {customer.status}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(customer, e)}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(customer.id);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Filter Customers
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {categories.length > 0 && (
                <div>
                  <label htmlFor="category_filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    id="category_filter"
                    value={activeFilters.category_id || ''}
                    onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="status_filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  id="status_filter"
                  value={activeFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="inline-flex justify-center rounded-md border border-transparent bg-[#f26722] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
              >
                Apply Filters
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    id="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {categories.length > 0 && (
                  <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">No Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6 flex space-x-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-[#f26722] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEditing ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded bg-white dark:bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </Dialog.Title>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="mt-5 sm:mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => customerToDelete && handleDelete(customerToDelete)}
                className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}