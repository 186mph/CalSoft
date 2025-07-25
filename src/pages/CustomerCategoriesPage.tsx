import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerCategoryManagement from '../components/customers/CustomerCategoryManagement';

export default function CustomerCategoriesPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Customer Categories
        </h1>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-300">
          Manage categories for organizing your customers. Categories help you segment your customer base 
          for better analysis and targeted marketing.
        </p>
      </div>

      <CustomerCategoryManagement />
    </div>
  );
} 