'use client';

import { useEffect, useState } from 'react';
import { CustomPaperSize, PrinterRole, StandardPaperSizeDefinition } from '@snapprint/contracts';
import {
  AgentDevice,
  fetchStudioDevices,
  fetchStudioPrinters,
  StudioFleetAllowance,
  StudioPrinter,
  updatePrinterRole,
} from '../../src/printer-client';
import { fetchStudioPaperSizes } from '../../src/printer-capability-client';

export function usePrinterFleetData(studioId: string) {
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [standardSizes, setStandardSizes] = useState<StandardPaperSizeDefinition[]>([]);
  const [customSizes, setCustomSizes] = useState<CustomPaperSize[]>([]);
  const [allowance, setAllowance] = useState<StudioFleetAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, dData, sData] = await Promise.all([
        fetchStudioPrinters(studioId),
        fetchStudioDevices(studioId),
        fetchStudioPaperSizes(studioId).catch(() => ({ standard: [], custom: [] })),
      ]);
      setPrinters(pData.printers);
      setAllowance(pData.allowance ?? null);
      setDevices(dData.devices);
      setStandardSizes(sData.standard || []);
      setCustomSizes(sData.custom || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [studioId]);

  const handleRoleChange = async (printerId: string, role: PrinterRole) => {
    setUpdatingId(printerId);
    setError(null);
    try {
      await updatePrinterRole(studioId, printerId, role);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update printer role');
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    printers,
    devices,
    standardSizes,
    customSizes,
    allowance,
    loading,
    error,
    updatingId,
    loadAll,
    handleRoleChange,
  };
}
