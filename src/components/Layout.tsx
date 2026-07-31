import { useState, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
