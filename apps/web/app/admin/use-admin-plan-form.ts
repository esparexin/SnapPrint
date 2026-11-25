'use client';

import { useState } from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import {
  createPlatformSubscriptionPlan,
  updatePlatformSubscriptionPlan,
} from '../../src/platform-plans-client';

export function useAdminPlanForm({
  plan,
  onSaved,
}: {
  plan: SubscriptionPlanDefinition | null;
  onSaved: () => void;
}) {
  const isEditing = Boolean(plan);
  const [id, setId] = useState(plan?.id || '');
  const [name, setName] = useState(plan?.name || '');
  const [durationDays, setDurationDays] = useState(
    plan?.durationDays ? String(plan.durationDays) : '30'
  );
  const [priceRupees, setPriceRupees] = useState(plan ? String(plan.priceRupees) : '0');
  const [category, setCategory] = useState<'free' | 'paid'>(plan?.category || 'paid');
  const [intervalMonths, setIntervalMonths] = useState(
    plan?.intervalMonths ? String(plan.intervalMonths) : '1'
  );
  const [isActive, setIsActive] = useState(plan ? plan.isActive : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(durationDays, 10);
    const price = parseInt(priceRupees, 10);
    if (!name.trim()) return setError('Plan name is required.');
    if (isNaN(days) || days <= 0 || days > 3650)
      return setError('Duration must be between 1 and 3650 days.');
    if (isNaN(price) || price < 0) return setError('Price must be 0 or positive.');
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        durationDays: days,
        priceRupees: price,
        category,
        intervalMonths: intervalMonths ? parseInt(intervalMonths, 10) : undefined,
        isActive,
      };
      if (isEditing) {
        await updatePlatformSubscriptionPlan(plan!.id, payload);
      } else {
        if (!id.trim()) return setError('Plan identifier is required.');
        await createPlatformSubscriptionPlan({ ...payload, id: id.trim().toLowerCase() });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return {
    isEditing,
    id,
    setId,
    name,
    setName,
    durationDays,
    setDurationDays,
    priceRupees,
    setPriceRupees,
    category,
    setCategory,
    intervalMonths,
    setIntervalMonths,
    isActive,
    setIsActive,
    loading,
    error,
    handleSubmit,
  };
}
