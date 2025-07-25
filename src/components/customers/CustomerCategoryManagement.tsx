import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Filter, Settings } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { 
  CustomerCategory, 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../../services/customerService';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  rules?: CategoryRule[];
}

interface CategoryRule {
  id?: string;
  field: string;
  operator: string;
  value: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
  color: '#4F46E5', // Default indigo color
  rules: [],
};

// Predefined color options
const colorOptions = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
];

// Available fields for category assignment rules
const availableFields = [
  { id: 'company_name', label: 'Company Name' },
  { id: 'email', label: 'Email' },
  { id: 'address', label: 'Address' },
  { id: 'status', label: 'Status' }
];

// Operators for rules
const operators = [
  { id: 'contains', label: 'Contains' },
  { id: 'equals', label: 'Equals' },
  { id: 'starts_with', label: 'Starts With' },
  { id: 'ends_with', label: 'Ends With' }
];

export default function CustomerCategoryManagement() {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEditing && categoryToEdit) {
        // Update existing category
        await updateCategory(categoryToEdit, formData);
      } else {
        // Create new category
        await createCategory(formData);
      }

      setIsOpen(false);
      setFormData(initialFormData);
      setIsEditing(false);
      setCategoryToEdit(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  }

  async function handleDelete(categoryId: string) {
    try {
      await deleteCategory(categoryId);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }

  function confirmDelete(categoryId: string) {
    setCategoryToDelete(categoryId);
    setDeleteConfirmOpen(true);
  }

  function handleEdit(category: CustomerCategory) {
    setIsEditing(true);
    setCategoryToEdit(category.id);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      rules: category.rules || []
    });
    setIsOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleColorSelect(color: string) {
    setFormData(prev => ({ ...prev, color }));
  }

  function addRule() {
    setFormData(prev => ({
      ...prev,
      rules: [...(prev.rules || []), { field: 'company_name', operator: 'contains', value: '' }]
    }));
  }

  function updateRule(index: number, field: string, value: string) {
    if (!formData.rules) return;
    
    const updatedRules = [...formData.rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    
    setFormData(prev => ({
      ...prev,
      rules: updatedRules
    }));
  }

  function removeRule(index: number) {
    if (!formData.rules) return;
    
    const updatedRules = formData.rules.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      rules: updatedRules
    }));
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading categories...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Customer Categories
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Manage categories for organizing your customers
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setCategoryToEdit(null);
            setFormData(initialFormData);
            setIsOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2 sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {categories.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">No categories found. Create one to get started.</p>
            </li>
          ) : (
            categories.map(category => (
              <li key={category.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-3" 
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                    {category.rules && category.rules.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Filter className="h-3 w-3 inline mr-1" />
                        {category.rules.length} assignment {category.rules.length === 1 ? 'rule' : 'rules'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    className="inline-flex items-center text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(category.id)}
                    className="inline-flex items-center text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Add/Edit Category Dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                {isEditing ? 'Edit Category' : 'Add New Category'}
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-color focus:ring-accent-color sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-color focus:ring-accent-color sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-9 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-500' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleColorSelect(color.value)}
                        title={color.name}
                      >
                        {formData.color === color.value && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowRules(!showRules)}
                      className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {showRules ? 'Hide Assignment Rules' : 'Show Assignment Rules'}
                    </button>
                  </div>

                  {showRules && (
                    <div className="mt-3 space-y-3">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Define rules to automatically assign customers to this category based on their attributes.
                      </div>
                      
                      {formData.rules && formData.rules.length > 0 ? (
                        <div className="space-y-2">
                          {formData.rules.map((rule, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <select
                                value={rule.field}
                                onChange={(e) => updateRule(index, 'field', e.target.value)}
                                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-accent-color focus:ring-accent-color sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                {availableFields.map(field => (
                                  <option key={field.id} value={field.id}>{field.label}</option>
                                ))}
                              </select>
                              
                              <select
                                value={rule.operator}
                                onChange={(e) => updateRule(index, 'operator', e.target.value)}
                                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-accent-color focus:ring-accent-color sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                {operators.map(op => (
                                  <option key={op.id} value={op.id}>{op.label}</option>
                                ))}
                              </select>
                              
                              <input
                                type="text"
                                value={rule.value}
                                onChange={(e) => updateRule(index, 'value', e.target.value)}
                                placeholder="Value"
                                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-accent-color focus:ring-accent-color sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                              
                              <button
                                type="button"
                                onClick={() => removeRule(index)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No rules defined.</p>
                      )}
                      
                      <button
                        type="button"
                        onClick={addRule}
                        className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Rule
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-color hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color"
                >
                  {isEditing ? 'Update' : 'Create'}
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
              Confirm Deletion
            </Dialog.Title>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
              Customers assigned to this category will no longer have a category.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => categoryToDelete && handleDelete(categoryToDelete)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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