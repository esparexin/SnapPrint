import { Db } from 'mongodb';
import {
  EmailSchema,
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
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
}

export const CreateUserInputSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: z.string().trim().min(1).max(120),
  passwordHash: z.string().min(1),
  status: UserStatusSchema.optional().default('active'),
});

export type CreateUserInput = z.input<typeof CreateUserInputSchema>;

/**
 * Projects a raw MongoDB UserDocument into a safe public User DTO.
 * Guarantees passwordHash and internal identifiers are never leaked.
 */
export function toPublicUser(doc: UserDocument): User {
  return UserSchema.parse({
    id: doc.id,
    email: doc.email,
    name: doc.name,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  });
}

/**
 * Maps a MongoDB UserDocument into an internal UserWithPasswordHash for authentication flows.
 */
export function toUserWithPasswordHash(doc: UserDocument): UserWithPasswordHash {
  return UserWithPasswordHashSchema.parse({
    id: doc.id,
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  });
}

/**
 * Persists a new operator user in MongoDB with native BSON Date timestamps.
 * Throws a clean error if email or ID violates unique index constraints.
 */
export async function createUser(db: Db, input: CreateUserInput): Promise<User> {
  const validated = CreateUserInputSchema.parse(input);
  const now = new Date();

  const doc: UserDocument = {
    id: validated.id,
    email: validated.email,
    name: validated.name,
    passwordHash: validated.passwordHash,
    status: validated.status,
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

/**
 * Finds an operator user by normalized email, including password hash for login verification.
 * Performs a single indexed query against the unique email index.
 */
export async function findUserByEmail(db: Db, email: string): Promise<UserWithPasswordHash | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { _id: 0 } });

  if (!doc) {
    return null;
  }

  return toUserWithPasswordHash(doc);
}

/**
 * Finds raw UserDocument by normalized email for internal authentication and security checks.
 */
export async function findUserDocumentByEmail(db: Db, email: string): Promise<UserDocument | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { _id: 0 } });

  return doc ? { ...doc } : null;
}

/**
 * Finds an operator user by normalized email, returning only the safe public DTO without password hash.
 */
export async function findPublicUserByEmail(db: Db, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ email: normalizedEmail }, { projection: { passwordHash: 0, _id: 0 } });

  if (!doc) {
    return null;
  }

  return toPublicUser(doc);
}

/**
 * Finds an operator user by ID, returning only the safe public DTO.
 */
export async function findUserById(db: Db, id: string): Promise<User | null> {
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ id }, { projection: { passwordHash: 0, _id: 0 } });

  if (!doc) {
    return null;
  }

  return toPublicUser(doc);
}

/**
 * Finds an operator user by ID including password hash for internal credential operations.
 */
export async function findInternalUserById(
  db: Db,
  id: string
): Promise<UserWithPasswordHash | null> {
  const doc = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });

  if (!doc) {
    return null;
  }

  return toUserWithPasswordHash(doc);
}

/**
 * Updates an operator user's status (active, suspended, invited).
 */
export async function updateUserStatus(db: Db, id: string, status: UserStatus): Promise<boolean> {
  const result = await db
    .collection<UserDocument>(USERS_COLLECTION)
    .updateOne({ id }, { $set: { status, updatedAt: new Date() } });

  return result.matchedCount > 0;
}

/**
 * Records a failed login attempt, optionally applying a lockout timestamp.
 */
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

/**
 * Resets failed login attempts and clears lockout timestamp upon successful login.
 */
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
