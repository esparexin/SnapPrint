'use client';

import { useEffect, useState } from 'react';
import { fetchStudioDevices } from '../../src/printer-client';

export function usePcAgentStatus(activeStudioId?: string): boolean {
  const [isPcBound, setIsPcBound] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!activeStudioId) {
      setIsPcBound(false);
      return;
    }

    const checkDevices = () => {
      fetchStudioDevices(activeStudioId)
        .then((res) => {
          if (mounted) {
            setIsPcBound(res.devices.some((d) => d.status === 'active'));
          }
        })
        .catch(() => {});
    };

    checkDevices();
    const timer = setInterval(checkDevices, 15_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeStudioId]);

  return isPcBound;
}
