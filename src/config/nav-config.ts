import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 */
export const navItems: NavItem[] = [
  {
    title: 'Draft Assistant',
    url: '/draft',
    icon: 'kanban',
    isActive: false,
    shortcut: ['d', 'a'],
    items: []
  }
];

