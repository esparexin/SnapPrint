import { Permission } from '@snapprint/contracts';

export interface ModuleItem {
  title: string;
  icon: string;
  desc: string;
  permission: Permission;
  action?: () => void;
  actionLabel: string;
}

export interface ModuleCardsActions {
  onOpenQrModal?: () => void;
  onOpenOrdersModal?: () => void;
  onOpenSetupModal?: () => void;
  onOpenPrintersModal?: () => void;
  onOpenStaffModal?: () => void;
  onOpenProfileModal?: () => void;
  onOpenPaymentModal?: () => void;
}

export function buildShopModules(actions: ModuleCardsActions): ModuleItem[] {
  return [
    {
      title: 'Orders',
      icon: '📄',
      desc: 'Incoming customer print & photocopy jobs.',
      permission: 'view_orders',
      action: actions.onOpenOrdersModal,
      actionLabel: 'Open Orders',
    },
    {
      title: 'Printers',
      icon: '🖨️',
      desc: 'Printers, drivers, and print agent connection.',
      permission: 'manage_printers',
      action: actions.onOpenPrintersModal,
      actionLabel: 'Manage Printers',
    },
    {
      title: 'QR Stand',
      icon: '📱',
      desc: 'Download & print counter QR stand for customer scans.',
      permission: 'manage_studio',
      action: actions.onOpenQrModal,
      actionLabel: 'Download QR',
    },
    {
      title: 'Payments',
      icon: '💰',
      desc: 'Set per-page print rates, UPI, and cash collection.',
      permission: 'manage_studio',
      action: actions.onOpenPaymentModal,
      actionLabel: 'Payment Rates',
    },
    {
      title: 'Shop Settings',
      icon: '🏪',
      desc: 'Update shop name, contact number, and pause orders.',
      permission: 'manage_studio',
      action: actions.onOpenProfileModal,
      actionLabel: 'Edit Profile',
    },
    {
      title: 'Staff',
      icon: '👥',
      desc: 'Invite operators and manage staff permissions.',
      permission: 'manage_staff',
      action: actions.onOpenStaffModal,
      actionLabel: 'Manage Team',
    },
    {
      title: 'Setup Guide',
      icon: '⚙️',
      desc: 'Shop onboarding checklist and capabilities.',
      permission: 'manage_studio',
      action: actions.onOpenSetupModal,
      actionLabel: 'Setup Wizard',
    },
  ];
}
