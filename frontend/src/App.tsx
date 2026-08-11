import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AccountsView } from './components/AccountsView';
import { CategoriesView } from './components/CategoriesView';
import { TransactionsView } from './components/TransactionsView';
import { InstalmentsView } from './components/InstalmentsView';
import { StatementsView } from './components/StatementsView';
import { QuickAddModal } from './components/QuickAddModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { ToastContainer } from './components/Toast';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500/30">
      {/* Header Bar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex pb-20 lg:pb-8">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'transactions' && <TransactionsView />}
          {activeTab === 'instalments' && <InstalmentsView />}
          {activeTab === 'statements' && <StatementsView />}
        </main>
      </div>

      {/* Modals & Overlay Containers */}
      <QuickAddModal />
      <ApiConfigModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}

