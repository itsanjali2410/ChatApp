
import React from 'react';
import type { Page } from '../types';
import { PlusIcon } from './icons';

interface HeaderProps {
  navigateTo: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ navigateTo }) => {
  return (
    <header className="bg-brand-card shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigateTo({ type: 'dashboard' })}
          >
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-xl font-semibold text-brand-text">ZenDesk</span>
          </div>
          <button
            onClick={() => navigateTo({ type: 'raise' })}
            className="flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-accent transition-all duration-200 transform hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            Raise Ticket
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
