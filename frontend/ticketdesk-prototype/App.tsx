
import React, { useState } from 'react';
import type { Page } from './types';
import { TicketsProvider } from './hooks/useTickets';
import Header from './components/Header';
import DashboardPage from './components/DashboardPage';
import RaiseTicketPage from './components/RaiseTicketPage';
import TicketDetailsPage from './components/TicketDetailsPage';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ type: 'dashboard' });

  const navigateTo = (newPage: Page) => {
    setPage(newPage);
  };

  const renderPage = () => {
    switch (page.type) {
      case 'dashboard':
        return <DashboardPage navigateTo={navigateTo} />;
      case 'raise':
        return <RaiseTicketPage navigateTo={navigateTo} />;
      case 'details':
        return <TicketDetailsPage ticketId={page.ticketId} navigateTo={navigateTo} />;
      default:
        return <DashboardPage navigateTo={navigateTo} />;
    }
  };

  return (
    <TicketsProvider>
      <div className="min-h-screen font-sans">
        <Header navigateTo={navigateTo} />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </TicketsProvider>
  );
};

export default App;
