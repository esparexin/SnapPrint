'use client';

import { useEffect, useState } from 'react';
import {
  CustomPaperSize,
  PrinterRole,
  StandardPaperSizeDefinition,
  Studio,
} from '@snapprint/contracts';
import {
  AgentDevice,
  fetchStudioDevices,
  fetchStudioPrinters,
  StudioFleetAllowance,
  StudioPrinter,
  updatePrinterRole,
} from '../../src/printer-client';
import { fetchStudioPaperSizes } from '../../src/printer-capability-client';
import { fetchStudio } from '../../src/workspace-client';

export function usePrinterFleetData(studioId: string) {
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [standardSizes, setStandardSizes] = useState<StandardPaperSizeDefinition[]>([]);
  const [customSizes, setCustomSizes] = useState<CustomPaperSize[]>([]);
  const [enabledSizes, setEnabledSizes] = useState<string[]>(['A4']);
  const [allowance, setAllowance] = useState<StudioFleetAllowance | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, dData, sData, studioData] = await Promise.all([
        fetchStudioPrinters(studioId),
        fetchStudioDevices(studioId),
        fetchStudioPaperSizes(studioId).catch(() => ({
          standard: [],
          custom: [],
          enabledSizes: [],
        })),
        fetchStudio(studioId).catch(() => null),
      ]);
      setPrinters(pData.printers);
      setAllowance(pData.allowance ?? null);
      setDevices(dData.devices);
      setStandardSizes(sData.standard || []);
      setCustomSizes(sData.custom || []);
      setEnabledSizes(sData.enabledSizes || ['A4']);
      setStudio(studioData?.studio ?? null);
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
    enabledSizes,
    allowance,
    studio,
    loading,
    error,
    updatingId,
    loadAll,
    handleRoleChange,
  };
}
