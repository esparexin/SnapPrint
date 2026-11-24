import { randomBytes } from 'node:crypto';
import { Db } from 'mongodb';
import {
  CreatePlatformAdminUserRequest,
  ListPlatformUsersResponse,
  PlatformUserItem,
} from '@snapprint/contracts';
import { AUDIT_LOGS_COLLECTION, PlatformAuditLogDocument } from './platform-admin.repository.js';

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return new Date(val).toISOString();
  return new Date().toISOString();
}

export async function listPlatformUsers(db: Db, limit = 50): Promise<ListPlatformUsersResponse> {
  const users = await db
    .collection('users')
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const userIds = users.map((u) => u.id as string);
  const memberships = await db
    .collection('user_memberships')
    .find({ userId: { $in: userIds }, status: 'active' })
    .toArray();

  const membershipMap = new Map<string, { role: string; studioId?: string }>();
  for (const m of memberships) {
    if (!membershipMap.has(m.userId) || m.role === 'platform_admin') {
      membershipMap.set(m.userId, { role: m.role, studioId: m.studioId });
    }
  }

  const result: PlatformUserItem[] = users.map((u) => {
    const mem = membershipMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      status: (u.status || 'active') as 'active' | 'suspended' | 'pending_verification',
      role: (mem?.role || 'studio_owner') as 'platform_admin' | 'studio_owner' | 'studio_staff',
      studioId: mem?.studioId || null,
      createdAt: toIsoString(u.createdAt),
    };
  });

  return {
    users: result,
    total: await db.collection('users').countDocuments({}),
  };
}

export async function createPlatformAdminUser(
  db: Db,
  input: CreatePlatformAdminUserRequest,
  actorId: string
): Promise<PlatformUserItem> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date();

  const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
  let userId: string;

  if (!existingUser) {
    userId = `user_${randomBytes(12).toString('hex')}`;
    await db.collection('users').insertOne({
      id: userId,
      email: normalizedEmail,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      status: 'active',
      passwordHash: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    userId = existingUser.id as string;
    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          name: input.name.trim(),
          status: 'active',
          updatedAt: now,
          ...(input.phone ? { phone: input.phone.trim() } : {}),
        },
      }
    );
  }

  const membershipFilter = { userId, role: 'platform_admin' };
  const existingMembership = await db.collection('user_memberships').findOne(membershipFilter);

  if (!existingMembership) {
    await db.collection('user_memberships').insertOne({
      id: `mem_${randomBytes(12).toString('hex')}`,
      userId,
      studioId: 'platform_scope',
      role: 'platform_admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db.collection('user_memberships').updateOne(membershipFilter, {
      $set: { status: 'active', studioId: 'platform_scope', updatedAt: now },
    });
  }

  const auditEntry: PlatformAuditLogDocument = {
    id: `audit_${Date.now()}_${randomBytes(6).toString('hex')}`,
    timestamp: now,
    actorId,
    action: 'user.platform_admin_created',
    targetType: 'user',
    targetId: userId,
    metadata: { email: normalizedEmail, name: input.name },
  };
  await db.collection(AUDIT_LOGS_COLLECTION).insertOne(auditEntry);

  return {
    id: userId,
    email: normalizedEmail,
    name: input.name.trim(),
    phone: input.phone?.trim(),
    status: 'active',
    role: 'platform_admin',
    studioId: 'platform_scope',
    createdAt: now.toISOString(),
  };
}

export async function updatePlatformUserStatus(
  db: Db,
  userId: string,
  newStatus: 'active' | 'suspended',
  actorId: string
): Promise<{ success: boolean; userId: string; status: 'active' | 'suspended' }> {
  if (userId === actorId && newStatus === 'suspended') {
    throw new Error('SELF_SUSPENSION_PREVENTED: Cannot suspend your own platform admin account.');
  }

  const now = new Date();
  const user = await db.collection('users').findOne({ id: userId });
  if (!user) {
    throw new Error('USER_NOT_FOUND: User does not exist.');
  }

  await db
    .collection('users')
    .updateOne({ id: userId }, { $set: { status: newStatus, updatedAt: now } });
  await db
    .collection('user_memberships')
    .updateMany({ userId }, { $set: { status: newStatus, updatedAt: now } });

  const auditEntry: PlatformAuditLogDocument = {
    id: `audit_${Date.now()}_${randomBytes(6).toString('hex')}`,
    timestamp: now,
    actorId,
    action: 'user.status_change',
    targetType: 'user',
    targetId: userId,
    metadata: { previousStatus: user.status, newStatus },
  };
  await db.collection(AUDIT_LOGS_COLLECTION).insertOne(auditEntry);

  return { success: true, userId, status: newStatus };
}
