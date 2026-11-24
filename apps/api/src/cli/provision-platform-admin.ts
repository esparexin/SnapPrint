import { randomBytes } from 'node:crypto';
import { Db, MongoClient } from 'mongodb';

interface ProvisionOptions {
  email: string;
  name?: string;
  mongoUri?: string;
  dbName?: string;
  customDb?: Db;
}

export async function provisionPlatformAdmin({
  email,
  name = 'Platform Superadmin',
  mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  dbName = process.env.MONGODB_DB_NAME || 'snapprint',
  customDb,
}: ProvisionOptions): Promise<{ userId: string; role: string }> {
  let client: MongoClient | null = null;
  let db: Db;

  if (customDb) {
    db = customDb;
  } else {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    const user = await db.collection('users').findOne({ email: normalizedEmail });
    let userId: string;

    if (!user) {
      userId = `user_${randomBytes(12).toString('hex')}`;
      await db.collection('users').insertOne({
        id: userId,
        email: normalizedEmail,
        name,
        phone: '+919999999999',
        status: 'active',
        passwordHash: null,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      userId = user.id as string;
      await db
        .collection('users')
        .updateOne({ id: userId }, { $set: { status: 'active', updatedAt: now } });
    }

    const membershipFilter = {
      userId,
      role: 'platform_admin',
    };

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
      await db
        .collection('user_memberships')
        .updateOne(membershipFilter, { $set: { status: 'active', updatedAt: now } });
    }

    await db.collection('audit_logs').insertOne({
      id: `audit_${randomBytes(12).toString('hex')}`,
      timestamp: now,
      actorId: 'cli_provisioner',
      action: 'PLATFORM_ADMIN_PROVISIONED',
      targetType: 'user',
      targetId: userId,
      reason: 'Automated platform admin provisioning CLI',
      metadata: { email: normalizedEmail },
    });

    return { userId, role: 'platform_admin' };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

if (
  process.argv[1]?.endsWith('provision-platform-admin.ts') ||
  process.argv[1]?.endsWith('provision-platform-admin.js')
) {
  const args = process.argv.slice(2);
  let targetEmail = '';
  let targetName = 'Platform Administrator';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      targetEmail = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      targetName = args[i + 1];
      i++;
    }
  }

  if (!targetEmail) {
    console.error(
      'Usage: tsx apps/api/src/cli/provision-platform-admin.ts --email <admin@domain.com> [--name "Admin Name"]'
    );
    process.exit(1);
  }

  provisionPlatformAdmin({ email: targetEmail, name: targetName })
    .then((res) => {
      console.log(
        `[PROVISION] SUCCESS: ${targetEmail} is now a platform_admin (ID: ${res.userId})`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[PROVISION] ERROR:`, err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
