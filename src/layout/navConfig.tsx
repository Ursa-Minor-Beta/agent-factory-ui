import {
  IconRobot,
  IconSettings,
  IconKey,
  IconLock,
  IconHistory,
  IconMessages,
  IconUsers,
  IconFiles,
  IconTool,
  IconDatabase,
  IconFolders,
} from '@tabler/icons-react';
import type { NavItem } from './types';

export const getBaseNavItems = (): NavItem[] => [
  { label: 'Workspaces', path: '/workspaces', icon: <IconFolders size={20} /> },
  { label: 'Agents', path: '/agents', icon: <IconRobot size={20} /> },
  { label: 'Providers', path: '/providers', icon: <IconSettings size={20} /> },
  { label: 'Secrets', path: '/secrets', icon: <IconLock size={20} /> },
  { label: 'Collections', path: '/collections', icon: <IconDatabase size={20} /> },
  { label: 'Sessions', path: '/sessions', icon: <IconMessages size={20} /> },
  { label: 'Runs', path: '/runs', icon: <IconHistory size={20} /> },
  { label: 'Files', path: '/files', icon: <IconFiles size={20} /> },
  {
    label: 'Settings',
    path: '/settings',
    icon: <IconTool size={20} />,
    children: [
      { label: 'Users', path: '/settings/users', icon: <IconUsers size={18} />, adminOnly: true },
      { label: 'API Keys', path: '/settings/api-keys', icon: <IconKey size={18} /> },
      { label: 'System', path: '/settings/system', icon: <IconSettings size={18} />, adminOnly: true },
    ],
  },
];
