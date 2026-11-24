import { AuthResponse } from '@snapprint/contracts';

interface HomeNavOptions {
  auth: AuthResponse | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenPortal: () => void;
  onLogout: () => void;
}

export function buildHomeTopNav({
  auth,
  onOpenLogin,
  onOpenRegister,
  onOpenPortal,
  onLogout,
}: HomeNavOptions) {
  const isSuper = Boolean(
    auth?.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active')
  );

  return [
    { label: 'About', href: '/about', variant: 'text' as const },
    ...(auth
      ? [
          isSuper
            ? { label: 'Admin Workspace', href: '/admin', variant: 'text' as const }
            : { label: 'Shop Portal', onClick: onOpenPortal, variant: 'text' as const },
          { label: 'Sign Out', onClick: onLogout, variant: 'button' as const },
        ]
      : [
          { label: 'Login', onClick: onOpenLogin, variant: 'text' as const },
          { label: 'Register', onClick: onOpenRegister, variant: 'button' as const },
        ]),
  ];
}
