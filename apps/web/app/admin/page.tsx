'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { AdminPortalView } from './admin-portal-view';

export default function PlatformAdminPage() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const userAuth = await fetchCurrentUser();
        if (mounted) setAuth(userAuth);
      } catch {
        if (mounted) setAuth(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutOperator();
      setAuth(null);
    } catch {
      // Continue to unauthenticated state on logout
      setAuth(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            SP
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Platform Administration</h2>
          <p className="text-sm text-gray-600 mb-6">
            Authentication is required to access the SnapPrint administrative governance portal.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
          >
            Sign In with Admin Account
          </Link>
        </div>
      </div>
    );
  }

  const isPlatformAdmin = auth.memberships.some(
    (m) => m.role === 'platform_admin' && m.status === 'active'
  );

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-red-200 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied (403)</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your account ({auth.user.email}) does not possess the{' '}
            <code className="bg-red-50 text-red-700 px-1 py-0.5 rounded font-mono text-xs">
              platform_admin
            </code>{' '}
            role required to access this workspace.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-block w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition"
            >
              Return to Shop Workspace
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-block w-full py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPortalView auth={auth} onLogout={handleLogout} />;
}
