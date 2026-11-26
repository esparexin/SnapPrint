'use client';

import { useEffect, useState } from 'react';
import { PrinterRole, Studio } from '@snapprint/contracts';
import {
  fetchStudioPrinters,
  StudioFleetAllowance,
  StudioPrinter,
  updatePrinterRole,
} from '../../src/printer-client';
import { fetchStudio } from '../../src/workspace-client';

export function usePrinterPageSetup(studioId: string) {
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [allowance, setAllowance] = useState<StudioFleetAllowance | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fleet, sData] = await Promise.all([
        fetchStudioPrinters(studioId),
        fetchStudio(studioId),
      ]);
      setPrinters(fleet.printers);
      setAllowance(fleet.allowance ?? null);
      setStudio(sData?.studio ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studioId]);

  const handleRoleChange = async (printerId: string, role: PrinterRole) => {
    setUpdatingId(printerId);
    setError(null);
    try {
      await updatePrinterRole(studioId, printerId, role);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update printer role.');
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    printers,
    allowance,
    studio,
    loading,
    error,
    updatingId,
    loadData,
    handleRoleChange,
  };
}
