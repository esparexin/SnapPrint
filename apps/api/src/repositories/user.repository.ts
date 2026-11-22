import { Db } from 'mongodb';
import {
  EmailSchema,
  PhoneNumberSchema,
  User,
  UserIdSchema,
  UserSchema,
  UserStatus,
  UserStatusSchema,
  UserWithPasswordHash,
  UserWithPasswordHashSchema,
  z,
} from '@snapprint/contracts';

export const USERS_COLLECTION = 'users';

export interface UserDocument {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  phone?: string | null;
  status: UserStatus;
  termsAcceptedVersion?: string | null;
  termsAcceptedAt?: Date | null;
  privacyPolicyAcceptedVersion?: string | null;
  privacyPolicyAcceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
}

export const CreateUserInputSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: z.string().trim().min(1).max(120),
  passwordHash: z.string().min(1).optional(),
  phone: PhoneNumberSchema.optional(),
  termsAcceptedVersion: z.string().trim().min(1).max(32).optional(),
  termsAcceptedAt: z.string().datetime().optional(),
  privacyPolicyAcceptedVersion: z.string().trim().min(1).max(32).optional(),
  privacyPolicyAcceptedAt: z.string().datetime().optional(),
  status: UserStatusSchema.optional().default('active'),
});

export type CreateUserInput = z.input<typeof CreateUserInputSchema>;

function toIso(d?: Date | string | null): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function mapUserFields(doc: UserDocument) {
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    phone: doc.phone ?? undefined,
    status: doc.status,
    termsAcceptedVersion: doc.termsAcceptedVersion ?? undefined,
    termsAcceptedAt: toIso(doc.termsAcceptedAt),
    privacyPolicyAcceptedVersion: doc.privacyPolicyAcceptedVersion ?? undefined,
    privacyPolicyAcceptedAt: toIso(doc.privacyPolicyAcceptedAt),
    createdAt: toIso(doc.createdAt)!,
    updatedAt: toIso(doc.updatedAt)!,
  };
}

/**
 * Projects a raw MongoDB UserDocument into a safe public User DTO.
 */
export function toPublicUser(doc: UserDocument): User {
  return UserSchema.parse(mapUserFields(doc));
}

/**
 * Maps a MongoDB UserDocument into an internal UserWithPasswordHash for authentication.
 */
export function toUserWithPasswordHash(doc: UserDocument): UserWithPasswordHash {
  return UserWithPasswordHashSchema.parse({
    ...mapUserFields(doc),
    passwordHash: doc.passwordHash ?? null,
  });
}

/**
 * Persists a new operator user in MongoDB with native BSON Date timestamps.
 */
export async function createUser(db: Db, input: CreateUserInput): Promise<User> {
  const validated = CreateUserInputSchema.parse(input);
  const now = new Date();

  const doc: UserDocument = {
    id: validated.id,
    email: validated.email,
    name: validated.name,
    passwordHash: validated.passwordHash ?? null,
    phone: validated.phone ?? null,
    status: validated.status,
    termsAcceptedVersion: validated.termsAcceptedVersion ?? null,
    termsAcceptedAt: validated.termsAcceptedAt ? new Date(validated.termsAcceptedAt) : null,
    privacyPolicyAcceptedVersion: validated.privacyPolicyAcceptedVersion ?? null,
    privacyPolicyAcceptedAt: validated.privacyPolicyAcceptedAt
      ? new Date(validated.privacyPolicyAcceptedAt)
      : null,
    createdAt: now,
    updatedAt: now,
    failedLoginAttempts: 0,
    lockoutUntil: null,
  };

  try {
    await db.collection<UserDocument>(USERS_COLLECTION).insertOne(doc);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    ) {
      const errorMsg = (error as { message?: string }).message ?? '';
      if (errorMsg.includes('email') || errorMsg.includes('uid_user_email')) {
        throw new Error(`User with email "${validated.email}" already exists`);
      }
      if (errorMsg.includes('id') || errorMsg.includes('uid_user_id')) {
        throw new Error(`User with ID "${validated.id}" already exists`);
      }
      throw new Error('User already exists (duplicate key violation)');
    }
    throw error;
  }

  return toPublicUser(doc);
}

/** Finds an operator user by normalized email including password hash. */
export async function findUserByEmail(db: Db, email: string): Promise<UserWithPasswordHash | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { _id: 0 } });
  return doc ? toUserWithPasswordHash(doc) : null;
}

/** Finds raw UserDocument by normalized email for internal security checks. */
export async function findUserDocumentByEmail(db: Db, email: string): Promise<UserDocument | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { _id: 0 } });
  return doc ? { ...doc } : null;
}

/** Finds an operator user by normalized email, returning safe public DTO. */
export async function findPublicUserByEmail(db: Db, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { passwordHash: 0, _id: 0 } });
  return doc ? toPublicUser(doc) : null;
}

/** Finds an operator user by ID, returning safe public DTO. */
export async function findUserById(db: Db, id: string): Promise<User | null> {
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ id }, { projection: { passwordHash: 0, _id: 0 } });
  return doc ? toPublicUser(doc) : null;
}

/** Finds an operator user by ID including password hash. */
export async function findInternalUserById(
  db: Db,
  id: string
): Promise<UserWithPasswordHash | null> {
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });
  return doc ? toUserWithPasswordHash(doc) : null;
}

/** Updates an operator user's status (active, suspended, invited). */
export async function updateUserStatus(db: Db, id: string, status: UserStatus): Promise<boolean> {
  const result = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .updateOne({ id }, { $set: { status, updatedAt: new Date() } });
  return result.matchedCount > 0;
}

/** Records a failed login attempt, optionally applying a lockout timestamp. */
export async function recordFailedLogin(db: Db, id: string, lockUntil?: Date): Promise<void> {
  const update: Record<string, unknown> = {
    $inc: { failedLoginAttempts: 1 },
    $set: { updatedAt: new Date() },
  };
  if (lockUntil) {
    (update.$set as Record<string, unknown>).lockoutUntil = lockUntil;
  }
  await db.collection<UserDocument>(USERS_COLLECTION).updateOne({ id }, update);
}

/** Resets failed login attempts and clears lockout timestamp. */
export async function resetFailedLogins(db: Db, id: string): Promise<void> {
  await db.collection<UserDocument>(USERS_COLLECTION).updateOne(
    { id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: new Date(),
      },
    }
  );
}
