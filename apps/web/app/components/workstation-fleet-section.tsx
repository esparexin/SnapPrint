'use client';

import React from 'react';
import { AgentDevice } from '../../src/printer-client';

interface WorkstationFleetSectionProps {
  devices: AgentDevice[];
  loading: boolean;
  onUnbindDevice: (device: AgentDevice) => void;
  onPairAgent: () => void;
}

export function WorkstationFleetSection({
  devices,
  loading,
  onUnbindDevice,
  onPairAgent,
}: WorkstationFleetSectionProps) {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 m-0">
            Connected Computers & Workstations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-0">
            Workstations hosting your local physical printers. Unbind old laptops when migrating to
            a new PC.
          </p>
        </div>
        <button
          type="button"
          onClick={onPairAgent}
          className="min-h-[44px] px-3.5 rounded-md border border-sky-600 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
        >
          + Pair Workstation
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500 text-sm">Loading workstations...</div>
      ) : devices.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm">
          No computers enrolled yet. Click &quot;Pair Workstation&quot; to link your first computer.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {devices.map((device) => {
            const isUnbound = device.status === ('unbound' as string);
            return (
              <div
                key={device.deviceId}
                className={`p-3 px-4 border border-slate-200 rounded-lg flex justify-between items-center flex-wrap gap-2 ${
                  isUnbound ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        device.isOnline ? 'bg-green-500' : 'bg-slate-400'
                      }`}
                    />
                    <strong
                      className={`text-sm ${isUnbound ? 'text-slate-400' : 'text-slate-900'}`}
                    >
                      {device.hostname}
                    </strong>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      {device.osPlatform}
                    </span>
                    {isUnbound && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        Unbound
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Agent v{device.agentVersion} · Last heartbeat:{' '}
                    {new Date(device.lastHeartbeatAt).toLocaleTimeString()}
                  </div>
                </div>

                {!isUnbound && (
                  <button
                    type="button"
                    onClick={() => onUnbindDevice(device)}
                    className="min-h-[44px] px-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                  >
                    Unbind Workstation
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
