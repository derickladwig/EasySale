import { ReactNode, useState } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface AppShellProps {
  children: ReactNode;
  topBar?: ReactNode;
  leftNav?: ReactNode;
  rightPanel?: ReactNode;
  bottomNav?: ReactNode;
  isDrawerOpen?: boolean;
  onDrawerClose?: () => void;
}

export function AppShell({
  children,
  topBar,
  leftNav,
  rightPanel,
  bottomNav,
  isDrawerOpen: externalDrawerOpen,
  onDrawerClose,
}: AppShellProps) {
  const { isTablet, isDesktop } = useBreakpoint();
  const [internalLeftNavOpen, setInternalLeftNavOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Use external drawer state if provided, otherwise use internal state
  const isLeftNavOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalLeftNavOpen;
  const setIsLeftNavOpen = onDrawerClose || setInternalLeftNavOpen;

  // Desktop: Persistent sidebar layout
  if (isDesktop) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* TopBar */}
        {topBar && <div className="flex-shrink-0">{topBar}</div>}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation - Persistent Sidebar */}
          {leftNav && (
            <aside className="w-60 flex-shrink-0 border-r border-border bg-background-secondary overflow-y-auto">
              {leftNav}
            </aside>
          )}

          {/* Main Workspace */}
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>

          {/* Right Context Panel - Optional Sidebar */}
          {rightPanel && (
            <aside className="w-80 flex-shrink-0 border-l border-border bg-background-secondary overflow-y-auto">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    );
  }

  // Tablet: Collapsible drawer layout
  if (isTablet) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* TopBar with hamburger */}
        {topBar && <div className="flex-shrink-0">{topBar}</div>}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Navigation - Drawer */}
          {leftNav && (
            <>
              {/* Overlay */}
              {isLeftNavOpen && (
                <div
                  className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-40"
                  onClick={() => setIsLeftNavOpen(false)}
                />
              )}

              {/* Drawer */}
              <aside
                className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-border z-50 transform transition-transform duration-300 ${
                  isLeftNavOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <div className="h-full overflow-y-auto">{leftNav}</div>
              </aside>
            </>
          )}

          {/* Main Workspace */}
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>

          {/* Right Panel - Modal/Drawer */}
          {rightPanel && isRightPanelOpen && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-40"
                onClick={() => setIsRightPanelOpen(false)}
              />

              {/* Drawer from right */}
              <aside className="fixed right-0 top-0 h-full w-96 bg-white border-l border-border z-50 overflow-y-auto">
                {rightPanel}
              </aside>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mobile: Full-screen with bottom nav
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* TopBar - Compact */}
      {topBar && <div className="flex-shrink-0">{topBar}</div>}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left Navigation - Full-screen Drawer */}
        {leftNav && (
          <>
            {/* Overlay */}
            {isLeftNavOpen && (
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-40"
                onClick={() => setIsLeftNavOpen(false)}
              />
            )}

            {/* Full-screen Drawer */}
            <aside
              className={`fixed left-0 top-0 h-full w-full bg-white z-50 transform transition-transform duration-300 ${
                isLeftNavOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="h-full overflow-y-auto">{leftNav}</div>
            </aside>
          </>
        )}

        {/* Main Workspace */}
        <main className="h-full overflow-y-auto bg-background">{children}</main>

        {/* Right Panel - Bottom Sheet */}
        {rightPanel && isRightPanelOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-40"
              onClick={() => setIsRightPanelOpen(false)}
            />

            {/* Bottom Sheet */}
            <aside className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-2xl z-50 overflow-y-auto">
              <div className="p-4">{rightPanel}</div>
            </aside>
          </>
        )}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      {bottomNav && (
        <div className="flex-shrink-0 border-t border-border bg-white">{bottomNav}</div>
      )}
    </div>
  );
}
