import { hashPassword } from '@snapprint/domain';
import { createTestApp, TestAuthContext } from './auth-test-helper.js';

export const makeHandoverItem = (assetId: string, filename: string) => ({
  assetId,
  filename,
  paperSize: 'A4' as const,
  colorMode: 'black_and_white' as const,
  sides: 'single_sided' as const,
  orientation: 'portrait' as const,
  scaling: 'fit_to_page' as const,
  pageSelection: 'all',
  copies: 1,
  documentPageCount: 3,
  selectedPagesCount: 3,
  sheetsCount: 3,
  unitPriceMinor: 200,
  subtotalMinor: 600,
});

export interface HandoverTestEnv {
  ctx: TestAuthContext;
  studioId: string;
  cookie: { name: string; value: string };
}

export async function seedHandoverEnvironment(): Promise<HandoverTestEnv> {
  const ctx = await createTestApp();
  const studioId = 'studio_mg_road';
  const passwordHash = await hashPassword('Password123!');

  ctx.studios.push({
    id: studioId,
    slug: 'mg-road-print',
    name: 'MG Road Print Hub',
    status: 'active',
    settings: {
      currency: 'INR',
      maxActivePrinters: 2,
      autoApproveOrders: false,
      paymentPolicy: 'pay_at_counter',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  ctx.users.push({
    id: 'usr_operator_1',
    email: 'operator@print.com',
    name: 'Operator Ananya',
    passwordHash,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  ctx.memberships.push({
    userId: 'usr_operator_1',
    studioId,
    role: 'studio_staff',
    status: 'active',
    createdAt: new Date(),
  });

  const loginRes = await ctx.app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'operator@print.com', password: 'Password123!' },
  });

  return { ctx, studioId, cookie: loginRes.cookies[0]! };
}
