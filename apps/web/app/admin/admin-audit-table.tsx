'use client';

import React from 'react';
import { PlatformAuditEntry } from '@snapprint/contracts';

export interface AdminAuditTableProps {
  logs: PlatformAuditEntry[];
  loading: boolean;
}

export function AdminAuditTable({ logs, loading }: AdminAuditTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Immutable Audit Trail</h2>
        <p className="text-xs text-gray-500">
          Cryptographically recorded actions, status modifications, and operator interventions
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Actor ID</th>
              <th className="px-6 py-3">Target</th>
              <th className="px-6 py-3">Reason / Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/75 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-xs text-blue-700 font-mono">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{log.actorId}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">
                    <span className="text-gray-400">{log.targetType}:</span> {log.targetId}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {log.reason ? (
                      <span className="italic">{log.reason}</span>
                    ) : (
                      <span className="text-gray-400">None provided</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
