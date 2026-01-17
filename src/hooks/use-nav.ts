'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';

/**
 * Hook to filter navigation items
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items
 */
export function useFilteredNavItems(items: NavItem[]) {
  // Simply return all items since we removed auth
  const filteredItems = useMemo(() => {
    return items.map((item) => {
      // Recursively include child items
      if (item.items && item.items.length > 0) {
        return {
          ...item,
          items: item.items
        };
      }
      return item;
    });
  }, [items]);

  return filteredItems;
}
