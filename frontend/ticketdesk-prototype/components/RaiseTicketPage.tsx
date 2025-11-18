
import React, { useState } from 'react';
import type { Page } from '../types';
import { useTickets } from '../hooks/useTickets';

interface RaiseTicketPageProps {
  navigateTo: (page: Page) => void;
}

const RaiseTicketPage: React.FC<RaiseTicketPageProps> = ({ navigateTo }) => {
  const { addTicket } = useTickets();
  const [formData, setFormData] = useState({
    name: '',
    pocName: '',
    mobile: '',
    destination: '',
    pax: 1,
    infants: 0,
    body: '',
    travelDate: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.travelDate) {
        addTicket(formData);
        setShowSuccess(true);
        setTimeout(() => {
          navigateTo({ type: 'dashboard' });
        }, 2000);
    } else {
        alert("Please provide a travel date.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-text mb-6">Raise a New Ticket</h1>
      <form onSubmit={handleSubmit} className="bg-brand-card p-8 rounded-2xl shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Name / Subject" name="name" value={formData.name} onChange={handleChange} required />
          <InputField label="Name of POC" name="pocName" value={formData.pocName} onChange={handleChange} required />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Mobile No." name="mobile" type="tel" value={formData.mobile} onChange={handleChange} required />
          <InputField label="Destination" name="destination" value={formData.destination} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField label="No. of Pax" name="pax" type="number" value={formData.pax.toString()} onChange={handleNumberChange} min="1" required />
          <InputField label="No. of Infants" name="infants" type="number" value={formData.infants.toString()} onChange={handleNumberChange} min="0" required />
          <InputField label="Travel Date" name="travelDate" type="date" value={formData.travelDate} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-slate-700 mb-1">Body</label>
          <textarea
            id="body"
            name="body"
            rows={6}
            value={formData.body}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-brand-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-brand-accent transition-all duration-200 transform hover:scale-105"
          >
            Submit Ticket
          </button>
        </div>
      </form>
      {showSuccess && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white py-3 px-5 rounded-lg shadow-xl animate-bounce">
          Ticket raised successfully! Redirecting...
        </div>
      )}
    </div>
  );
};


interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type = 'text', value, onChange, required = false, min }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      min={min}
      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition"
    />
  </div>
);

export default RaiseTicketPage;
