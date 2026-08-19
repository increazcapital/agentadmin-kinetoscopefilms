/* ============================================================
   Component: MainLayout.jsx
   Description: Root layout with Sidebar + Header + Outlet
   ============================================================ */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SupportWidget from '../../components/ui/SupportWidget';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return window.innerWidth >= 768 && window.innerWidth <= 1023;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Listen for window resize to auto-manage sidebar state
  useEffect(() => {
    const getBreakpointCategory = (width) => {
      if (width < 768) return 'mobile';
      if (width <= 1023) return 'tablet';
      return 'desktop';
    };

    let prevCategory = getBreakpointCategory(window.innerWidth);

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentCategory = getBreakpointCategory(currentWidth);

      if (currentCategory !== prevCategory) {
        if (currentCategory === 'tablet') {
          setIsCollapsed(true);
        } else if (currentCategory === 'desktop') {
          setIsCollapsed(false);
        } else if (currentCategory === 'mobile') {
          setIsCollapsed(false);
        }
        prevCategory = currentCategory;
      }

      if (currentWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const handleToggle = () => setIsCollapsed(prev => !prev);
  const handleMobileOpen = () => setIsMobileOpen(true);
  const handleMobileClose = () => setIsMobileOpen(false);

  return (
    <div className="kfpl-app">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        isMobileOpen={isMobileOpen}
        onMobileClose={handleMobileClose}
      />
      <div className={`kfpl-main-area ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          isCollapsed={isCollapsed}
          onMenuClick={handleMobileOpen}
        />
        <main className="kfpl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ============ END: MainLayout.jsx ============ */
