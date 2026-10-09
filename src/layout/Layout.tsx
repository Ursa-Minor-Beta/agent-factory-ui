import { Suspense, useEffect, lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppShell, Divider, Center, Loader } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceNav } from './useWorkspaceNav';
import { NavbarHeader } from './NavbarHeader';
import { NavbarLinks } from './NavbarLinks';
import { UserMenu } from './UserMenu';
import type { NavItem } from './types';

// Lazy load global modals
const RunDetailsModal = lazy(() =>
  import('../components/RunDetailsModal').then((module) => ({
    default: module.RunDetailsModal,
  }))
);

const AgentModalWrapper = lazy(() =>
  import('../components/AgentCreateModal').then((module) => ({
    default: module.AgentModalWrapper,
  }))
);

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [collapsed, setCollapsed] = useLocalStorage({
    key: 'nav-sidebar-collapsed',
    defaultValue: true,
  });

  const navItems = useWorkspaceNav();

  // Update browser tab title based on current page
  useEffect(() => {
    const findLabel = (items: NavItem[], path: string): string | null => {
      for (const item of items) {
        if (item.children) {
          const childLabel = findLabel(item.children, path);
          if (childLabel) return childLabel;
        }
        if (path === item.path || path.startsWith(item.path + '/')) {
          return item.label;
        }
      }
      return null;
    };

    const pageLabel = findLabel(navItems, location.pathname);
    document.title = pageLabel ? `Agent Factory | ${pageLabel}` : 'Agent Factory';
  }, [location.pathname, navItems]);

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterNavItems(item.children);
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        if (item.adminOnly && user?.role !== 'admin') return null;
        return item;
      })
      .filter((item): item is NavItem => item !== null);
  };

  const filteredNavItems = filterNavItems(navItems);
  const navbarWidth = collapsed ? 64 : 240;

  return (
    <AppShell
      navbar={{
        width: navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Navbar
        // p="xs"
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          borderRight: '1px solid var(--mantine-color-default-border)',
          transition: 'width 200ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NavbarHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpened={mobileOpened}
          toggleMobile={toggleMobile}
        />

        <Divider mb={1}/>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
          <NavbarLinks
            items={filteredNavItems}
            collapsed={collapsed}
            closeMobile={closeMobile}
          />
        </div>

        <Divider mt={1}/>

        <UserMenu collapsed={collapsed} />
      </AppShell.Navbar>

      <AppShell.Main style={{ minHeight: '100vh' }}>
        <Suspense fallback={<Center style={{ height: '100%', minHeight: 400 }}><Loader /></Center>}>
          <Outlet />
        </Suspense>
      </AppShell.Main>

      {/* Global modals - read state from URL */}
      <Suspense fallback={null}>
        <RunDetailsModal />
        <AgentModalWrapper />
      </Suspense>
    </AppShell>
  );
}
