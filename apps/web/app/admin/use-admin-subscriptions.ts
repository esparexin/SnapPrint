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
  const [pendingNotifyStudio, setPendingNotifyStudio] = useState<PlatformStudioItem | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

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

  const handleNotify = (studio: PlatformStudioItem) => {
    setPendingNotifyStudio(studio);
  };

  const confirmNotify = async () => {
    if (!pendingNotifyStudio) return;
    setNotifying(true);
    setNotifyError(null);
    try {
      await notifyStudioSubscription(pendingNotifyStudio.id);
      setNotifyMsg(`Notification email queued successfully for ${pendingNotifyStudio.name}`);
      setPendingNotifyStudio(null);
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : 'Failed to queue notification');
    } finally {
      setNotifying(false);
    }
  };

  const cancelNotify = () => {
    if (!notifying) {
      setPendingNotifyStudio(null);
    }
  };

  const clearNotifyError = () => {
    setNotifyError(null);
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
    pendingNotifyStudio,
    notifyError,
    notifying,
    counts,
    sorted,
    handleNotify,
    confirmNotify,
    cancelNotify,
    clearNotifyError,
  };
}
