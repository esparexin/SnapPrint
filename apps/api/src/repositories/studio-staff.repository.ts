import { randomBytes } from 'crypto';
import { Db } from 'mongodb';
import { StaffMember, StaffMemberSchema, UserStatus } from '@snapprint/contracts';
import {
  USER_MEMBERSHIPS_COLLECTION,
  UserMembershipDocument,
} from './membership.repository.js';
import { USERS_COLLECTION, UserDocument } from './user.repository.js';

export async function listStudioStaff(db: Db, studioId: string): Promise<StaffMember[]> {
  const memberships = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .find({ studioId })
    .toArray();

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((m) => m.userId);
  const users = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .find({ id: { $in: userIds } })
    .toArray();

  const userMap = new Map(users.map((u) => [u.id, u]));

  const staffList: StaffMember[] = [];
  for (const m of memberships) {
    const user = userMap.get(m.userId);
    const email = user?.email || `${m.userId}@local.snapprint`;
    const name = user?.name || undefined;

    // Map internal membership/user status to StaffMember status
    let status: 'active' | 'invited' | 'revoked' = 'active';
    if (m.status === 'invited') {
      status = 'invited';
    } else if (m.status === 'suspended') {
      status = 'revoked';
    }

    const item = {
      id: `${m.studioId}_${m.userId}`,
      userId: m.userId,
      studioId: m.studioId!,
      email,
      name,
      role: m.role,
      status,
      createdAt:
        m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
    };

    staffList.push(StaffMemberSchema.parse(item));
  }

  return staffList;
}

export interface InviteStudioStaffInput {
  studioId: string;
  email: string;
  name?: string;
  invitedByUserId?: string;
}

export async function inviteStudioStaff(
  db: Db,
  input: InviteStudioStaffInput
): Promise<StaffMember> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date();

  const existingUser = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail });

  let targetUserId = existingUser?.id;
  let targetUserName = existingUser?.name;

  if (!targetUserId) {
    targetUserId = `usr_${randomBytes(8).toString('hex')}`;
    targetUserName = input.name?.trim() || normalizedEmail.split('@')[0];
    const userDoc: UserDocument = {
      id: targetUserId,
      email: normalizedEmail,
      name: targetUserName,
      status: 'invited',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<UserDocument>(USERS_COLLECTION).insertOne(userDoc);
  }

  const existingMembership = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .findOne({ userId: targetUserId, studioId: input.studioId });

  if (existingMembership) {
    await db.collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION).updateOne(
      { userId: targetUserId, studioId: input.studioId },
      { $set: { role: 'studio_staff', status: 'invited' } }
    );
  } else {
    const membershipDoc: UserMembershipDocument = {
      userId: targetUserId,
      studioId: input.studioId,
      role: 'studio_staff',
      status: 'invited',
      createdAt: now,
    };
    await db.collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION).insertOne(membershipDoc);
  }

  return StaffMemberSchema.parse({
    id: `${input.studioId}_${targetUserId}`,
    userId: targetUserId,
    studioId: input.studioId,
    email: normalizedEmail,
    name: targetUserName,
    role: 'studio_staff',
    status: 'invited',
    createdAt: now.toISOString(),
    invitedByUserId: input.invitedByUserId,
  });
}

export async function revokeStudioStaff(
  db: Db,
  studioId: string,
  staffIdentifier: string
): Promise<boolean> {
  const userId = staffIdentifier.startsWith(`${studioId}_`)
    ? staffIdentifier.slice(studioId.length + 1)
    : staffIdentifier;

  const result = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .updateOne(
      { studioId, userId },
      { $set: { status: 'suspended' as UserStatus } }
    );

  return result.matchedCount > 0;
}
