'use client';

import { useEffect, useState } from 'react';
import { UserMembership } from '@snapprint/contracts';
import { fetchStudio } from '../../src/workspace-client';

export function extractTargetStudioIds(memberships?: UserMembership[]): string[] {
  if (!memberships || memberships.length === 0) return [];
  return Array.from(
    new Set(
      memberships
        .map((m) => m.studioId)
        .filter((id): id is string => Boolean(id && id !== 'platform_scope'))
    )
  );
}

export function useStudioNames(memberships?: UserMembership[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const studioIds = extractTargetStudioIds(memberships);
    if (studioIds.length === 0) return;

    let mounted = true;
    const missingIds = studioIds.filter((id) => !names[id]);
    if (missingIds.length === 0) return;

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetchStudio(id);
          return { id, name: res.studio.name };
        } catch {
          return { id, name: id };
        }
      })
    ).then((results) => {
      if (!mounted) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.name) next[r.id] = r.name;
        }
        return next;
      });
    });

    return () => {
      mounted = false;
    };
  }, [memberships]);

  return names;
}
