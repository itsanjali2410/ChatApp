'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket } from '../../../utils/api';
import api from '../../../utils/api';
import type { User } from '../../../types/chat';
import { getDisplayName } from '../../../utils/userUtils';

interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  min?: string;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  required = false, 
  min 
}) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      min={min}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
    />
  </div>
);

export default function RaiseTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    pocName: '',
    pocId: '',
    mobile: '',
    destination: '',
    adults: 1,
    children: 0,
    infants: 0,
    body: '',
    travelDate: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load users for POC dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await api.get("/users/by_org");
        setUsers(response.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load users. Please refresh the page.');
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target instanceof HTMLInputElement) {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    }
  };

  const handlePOCChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const selectedUser = users.find(u => u._id === selectedUserId);
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        pocId: selectedUserId,
        pocName: getDisplayName(selectedUser),
        mobile: selectedUser.phone || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError("Please provide a name/subject.");
      return;
    }
    
    if (!formData.pocName.trim()) {
      setError("Please select a Point of Contact.");
      return;
    }

    if (!formData.mobile.trim()) {
      setError("Please provide a mobile number.");
      return;
    }

    if (!formData.destination.trim()) {
      setError("Please provide a destination.");
      return;
    }

    if (!formData.body.trim()) {
      setError("Please provide a description/body.");
      return;
    }
    
    if (!formData.travelDate) {
      setError("Please provide a travel date.");
      return;
    }

    if (!formData.pocId) {
      setError("Please select a Point of Contact.");
      return;
    }

    // Validate numbers
    const adults = Number(formData.adults) || 0;
    const children = Number(formData.children) || 0;
    const infants = Number(formData.infants) || 0;
    
    if (adults < 1) {
      setError("Number of adults must be at least 1.");
      return;
    }

    if (infants < 0) {
      setError("Number of infants cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      // Convert to backend format (pax = adults + children for backward compatibility)
      // Ensure travelDate is in ISO format
      let travelDateISO = formData.travelDate;
      if (travelDateISO && !travelDateISO.includes('T')) {
        // If it's just YYYY-MM-DD, add time
        travelDateISO = travelDateISO + 'T00:00:00';
      }
      
      // Ensure all required fields are present and properly typed
      const ticketData: {
        name: string;
        pocName: string;
        mobile: string;
        destination: string;
        adults: number;
        children: number;
        infants: number;
        body: string;
        travelDate: string;
        pax: number;
        pocId?: string;
      } = {
        name: formData.name.trim(),
        pocName: formData.pocName.trim(),
        mobile: formData.mobile.trim(),
        destination: formData.destination.trim(),
        adults: adults,
        children: children,
        infants: infants,
        body: formData.body.trim(),
        travelDate: travelDateISO,
        pax: adults + children, // For backward compatibility
      };
      
      // Add optional fields only if they have values
      if (formData.pocId) {
        ticketData.pocId = formData.pocId;
      }
      
      console.log('Submitting ticket data:', JSON.stringify(ticketData, null, 2));
      await createTicket(ticketData);
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/tickets');
      }, 2000);
    } catch (err: unknown) {
      console.error('Failed to create ticket:', err);
      const error = err as { 
        response?: { 
          data?: { 
            detail?: string; 
            message?: string; 
            errors?: Array<{ field?: string; message?: string }> 
          }; 
          status?: number 
        } 
      };
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error response data:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error?.response?.data) {
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          // Pydantic validation errors
          const firstError = error.response.data.errors[0];
          errorMessage = `Validation error: ${firstError.field || 'unknown field'} - ${firstError.message || error.response.data.detail || 'Invalid data'}`;
        } else {
          errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Raise a New Ticket</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Name / Subject" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
            />
            <div>
              <label htmlFor="pocId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name of POC <span className="text-red-500">*</span>
              </label>
              <select
                id="pocId"
                name="pocId"
                value={formData.pocId}
                onChange={handlePOCChange}
                required
                disabled={loadingUsers}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {getDisplayName(user)} {user.email ? `(${user.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Mobile No." 
              name="mobile" 
              type="tel" 
              value={formData.mobile} 
              onChange={handleChange} 
              required 
            />
            <InputField 
              label="Destination" 
              name="destination" 
              value={formData.destination} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InputField 
              label="No. of Adults" 
              name="adults" 
              type="number" 
              value={formData.adults.toString()} 
              onChange={handleNumberChange} 
              min="1" 
              required 
            />
            <InputField 
              label="No. of Children" 
              name="children" 
              type="number" 
              value={formData.children.toString()} 
              onChange={handleNumberChange} 
              min="0" 
              required 
            />
            <InputField 
              label="No. of Infants" 
              name="infants" 
              type="number" 
              value={formData.infants.toString()} 
              onChange={handleNumberChange} 
              min="0" 
              required 
            />
            <InputField 
              label="Travel Date" 
              name="travelDate" 
              type="date" 
              value={formData.travelDate} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              rows={6}
              value={formData.body}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>

        {showSuccess && (
          <div className="fixed bottom-5 right-5 bg-green-500 text-white py-3 px-5 rounded-lg shadow-xl animate-bounce z-50">
            Ticket raised successfully! Redirecting...
          </div>
        )}
      </div>
    </div>
  );
}

