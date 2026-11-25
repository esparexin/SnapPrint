'use client';

import { useMemo, useState } from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import {
  computeTierCounts,
  filterStudiosByPlan,
  sortStudios,
  SubscriptionSortColumn,
  SortDirection,
} from './admin-subscription-helpers';
import { notifyStudioSubscription } from '../../src/platform-plans-client';

export function useAdminSubscriptions(studios: PlatformStudioItem[]) {
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<SubscriptionSortColumn>('studio');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const counts = useMemo(() => computeTierCounts(studios), [studios]);
  const filtered = useMemo(
    () => filterStudiosByPlan(studios, query, planFilter),
    [studios, query, planFilter]
  );
  const sorted = useMemo(
    () => sortStudios(filtered, sortCol, sortDir),
    [filtered, sortCol, sortDir]
  );

  const handleSort = (col: SubscriptionSortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleNotify = async (studio: PlatformStudioItem) => {
    if (!window.confirm(`Trigger subscription notice email for "${studio.name}"?`)) return;
    try {
      await notifyStudioSubscription(studio.id);
      setNotifyMsg(`Notification email queued successfully for ${studio.name}`);
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to queue notification');
    }
  };

  return {
    query,
    setQuery,
    planFilter,
    setPlanFilter,
    sortCol,
    sortDir,
    handleSort,
    notifyMsg,
    counts,
    sorted,
    handleNotify,
  };
}
