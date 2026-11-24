import { hashPassword } from '@snapprint/domain';
import { createTestApp, TestAuthContext } from './auth-test-helper.js';

export interface PlatformTestContext extends TestAuthContext {
  login: (email: string) => Promise<{ name: string; value: string }>;
}

export async function seedPlatformEnvironment(): Promise<PlatformTestContext> {
  const ctx = await createTestApp();
  const hash = await hashPassword('Password123!');

  // Admin user
  ctx.users.push({
    id: 'admin_user',
    email: 'superadmin@snapprint.in',
    name: 'Super Admin',
    passwordHash: hash,
    status: 'active',
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
    updatedAt: new Date('2026-11-20T10:00:00.000Z'),
  });
  ctx.memberships.push({
    userId: 'admin_user',
    studioId: null,
    role: 'platform_admin',
    status: 'active',
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
  });

  // Regular studio owner
  ctx.users.push({
    id: 'owner_user',
    email: 'owner@example.com',
    name: 'Shop Owner',
    passwordHash: hash,
    status: 'active',
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
    updatedAt: new Date('2026-11-20T10:00:00.000Z'),
  });
  ctx.memberships.push({
    userId: 'owner_user',
    studioId: 'studio_one',
    role: 'studio_owner',
    status: 'active',
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
  });

  // Studios
  ctx.studios.push(
    {
      id: 'studio_one',
      slug: 'studio-one',
      name: 'Studio One',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      payment: {
        enableCounterPayment: true,
        enableOnlinePayment: true,
        isRazorpayConfirmed: false,
      },
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
      updatedAt: new Date('2026-11-20T10:00:00.000Z'),
    },
    {
      id: 'studio_two',
      slug: 'studio-two',
      name: 'Studio Two',
      status: 'onboarding',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date('2026-11-21T10:00:00.000Z'),
      updatedAt: new Date('2026-11-21T10:00:00.000Z'),
    }
  );

  // Payments
  ctx.payments.push({
    paymentId: 'pay_001',
    studioId: 'studio_one',
    orderId: 'ord_001',
    amountMinor: 25000,
    currency: 'INR',
    status: 'SUCCEEDED',
    method: 'razorpay',
    createdAt: new Date('2026-11-22T10:00:00.000Z'),
    updatedAt: new Date('2026-11-22T10:00:00.000Z'),
  });

  // Subscriptions
  await ctx.db.collection('subscriptions').insertOne({
    studioId: 'studio_one',
    plan: 'quarterly',
    status: 'active',
    startsAt: new Date('2026-11-20T10:00:00.000Z'),
    expiresAt: new Date('2027-02-18T10:00:00.000Z'),
    updatedAt: new Date('2026-11-20T10:00:00.000Z'),
  });

  // Printers
  await ctx.db.collection('studio_printers').insertOne({
    id: 'printer_01',
    studioId: 'studio_one',
    name: 'Brother HL-L2321D',
    driverName: 'Brother Generic',
    status: 'online',
    role: 'primary',
    isColorSupported: false,
    supportedPaperSizes: ['A4'],
    isDefaultOsPrinter: true,
    lastSeenAt: new Date(),
    createdAt: new Date(),
  });

  const login = async (email: string) => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    });
    return res.cookies[0];
  };

  return { ...ctx, login };
}
