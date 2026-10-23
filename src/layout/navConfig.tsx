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
  IconCloud,
} from '@tabler/icons-react';
import type { NavItem } from './types';
import { routes } from '../config/routes';

export const getBaseNavItems = (): NavItem[] => [

  { label: 'Agents', path: routes.agents(), icon: <IconRobot size={20} /> },
  
  { label: 'Workspaces', path: routes.workspaces(), icon: <IconFolders size={20} /> },

  {
    label: 'Configurations',
    path: routes.configurations(),
    icon: <IconSettings size={20} />,
    children: [
      { label: 'Providers', path: routes.providers(), icon: <IconCloud size={18} /> },
      { label: 'Secrets', path: routes.secrets(), icon: <IconLock size={18} /> },
      { label: 'Collections', path: routes.collections(), icon: <IconDatabase size={18} /> },
    ],
  },
  
  {
    label: 'Monitoring',
    path: routes.monitoring(),
    icon: <IconHistory size={20} />,
    children: [
      { label: 'Sessions', path: routes.sessions(), icon: <IconMessages size={18} /> },
      { label: 'Runs', path: routes.runs(), icon: <IconHistory size={18} /> },
      { label: 'Files', path: routes.files(), icon: <IconFiles size={18} /> },
    ],
  },
  
  {
    label: 'Settings',
    path: routes.settings(),
    icon: <IconTool size={20} />,
    children: [
      { label: 'Users', path: routes.settingsUsers(), icon: <IconUsers size={18} />, adminOnly: true },
      { label: 'API Keys', path: routes.settingsApiKeys(), icon: <IconKey size={18} /> },
      { label: 'System', path: routes.settingsSystem(), icon: <IconSettings size={18} />, adminOnly: true },
    ],
  },
];
