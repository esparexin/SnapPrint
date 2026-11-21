import { Db } from 'mongodb';
import {
  StudioIdSchema,
  UserIdSchema,
  UserMembership,
  UserMembershipSchema,
  UserRole,
  UserRoleSchema,
  UserStatus,
  UserStatusSchema,
  z,
} from '@snapprint/contracts';

export const USER_MEMBERSHIPS_COLLECTION = 'user_memberships';

export interface UserMembershipDocument {
  userId: string;
  studioId: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export const CreateUserMembershipInputSchema = z.object({
  userId: UserIdSchema,
  studioId: StudioIdSchema.nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema.optional().default('active'),
});

export type CreateUserMembershipInput = z.input<typeof CreateUserMembershipInputSchema>;

export function toMembershipContract(doc: UserMembershipDocument): UserMembership {
  return UserMembershipSchema.parse({
    userId: doc.userId,
    studioId: doc.studioId,
    role: doc.role,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
  });
}

export async function createUserMembership(
  db: Db,
  input: CreateUserMembershipInput
): Promise<UserMembership> {
  const validated = CreateUserMembershipInputSchema.parse(input);
  const now = new Date();

  const doc: UserMembershipDocument = {
    userId: validated.userId,
    studioId: validated.studioId,
    role: validated.role,
    status: validated.status,
    createdAt: now,
  };

  await db.collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION).insertOne(doc);
  return toMembershipContract(doc);
}

export async function findUserMemberships(db: Db, userId: string): Promise<UserMembership[]> {
  const docs = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .find({ userId, status: 'active' }, { projection: { _id: 0 } })
    .toArray();

  return docs.map(toMembershipContract);
}

export async function findUserMembershipForStudio(
  db: Db,
  userId: string,
  studioId: string | null
): Promise<UserMembership | null> {
  const doc = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .findOne({ userId, studioId }, { projection: { _id: 0 } });

  return doc ? toMembershipContract(doc) : null;
}

export async function findMembershipsByStudio(db: Db, studioId: string): Promise<UserMembership[]> {
  const docs = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .find({ studioId }, { projection: { _id: 0 } })
    .toArray();

  return docs.map(toMembershipContract);
}

export async function updateMembershipStatus(
  db: Db,
  userId: string,
  studioId: string | null,
  status: UserStatus
): Promise<boolean> {
  const result = await db
    .collection<UserMembershipDocument>(USER_MEMBERSHIPS_COLLECTION)
    .updateOne({ userId, studioId }, { $set: { status } });

  return result.matchedCount > 0;
}
