import { randomUUID } from 'node:crypto';
import { Db } from 'mongodb';
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlanDefinition,
  SubscriptionPlanDefinitionSchema,
  UpdateSubscriptionPlanRequest,
} from '@snapprint/contracts';
import { AUDIT_LOGS_COLLECTION } from './platform-admin.repository.js';

export const SUBSCRIPTION_PLANS_COLLECTION = 'subscription_plans';

export const DEFAULT_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: 'free',
    name: 'Free Trial',
    durationDays: 30,
    priceRupees: 0,
    category: 'free',
    intervalMonths: 1,
    isActive: true,
    description: '30-day initial onboarding trial',
  },
  {
    id: 'quarterly',
    name: 'Quarterly Plan',
    durationDays: 90,
    priceRupees: 999,
    category: 'paid',
    intervalMonths: 3,
    isActive: true,
    description: '3 months full access',
  },
  {
    id: 'half_yearly',
    name: 'Half-Yearly Plan',
    durationDays: 180,
    priceRupees: 1799,
    category: 'paid',
    intervalMonths: 6,
    isActive: true,
    description: '6 months full access',
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    durationDays: 365,
    priceRupees: 2999,
    category: 'paid',
    intervalMonths: 12,
    isActive: true,
    description: '12 months best value',
  },
];

export async function ensureDefaultPlans(db: Db): Promise<void> {
  const count = await db.collection(SUBSCRIPTION_PLANS_COLLECTION).countDocuments();
  if (count === 0) {
    const now = new Date().toISOString();
    const docs = DEFAULT_PLANS.map((p) => ({
      ...p,
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection(SUBSCRIPTION_PLANS_COLLECTION).insertMany(docs);
  }
}

export async function listSubscriptionPlans(db: Db): Promise<SubscriptionPlanDefinition[]> {
  await ensureDefaultPlans(db);
  const docs = await db
    .collection(SUBSCRIPTION_PLANS_COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return docs.map((d) => SubscriptionPlanDefinitionSchema.parse(d));
}

export async function findSubscriptionPlanById(
  db: Db,
  id: string
): Promise<SubscriptionPlanDefinition | null> {
  const doc = await db
    .collection(SUBSCRIPTION_PLANS_COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });
  return doc ? SubscriptionPlanDefinitionSchema.parse(doc) : null;
}

export async function createSubscriptionPlan(
  db: Db,
  input: CreateSubscriptionPlanRequest,
  actorId: string
): Promise<SubscriptionPlanDefinition> {
  const now = new Date().toISOString();
  const existing = await findSubscriptionPlanById(db, input.id);
  if (existing) {
    throw new Error(`Plan with ID "${input.id}" already exists.`);
  }

  const doc: SubscriptionPlanDefinition = {
    ...input,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(SUBSCRIPTION_PLANS_COLLECTION).insertOne({ ...doc });

  await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
    id: `audit_${randomUUID()}`,
    timestamp: new Date(),
    actorId,
    action: 'subscription_plan.created',
    targetType: 'subscription_plan',
    targetId: doc.id,
    metadata: { name: doc.name, durationDays: doc.durationDays, priceRupees: doc.priceRupees },
  });

  return doc;
}

export async function updateSubscriptionPlan(
  db: Db,
  planId: string,
  input: UpdateSubscriptionPlanRequest,
  actorId: string
): Promise<SubscriptionPlanDefinition | null> {
  const existing = await findSubscriptionPlanById(db, planId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updateFields.name = input.name;
  if (input.durationDays !== undefined) updateFields.durationDays = input.durationDays;
  if (input.priceRupees !== undefined) updateFields.priceRupees = input.priceRupees;
  if (input.category !== undefined) updateFields.category = input.category;
  if (input.intervalMonths !== undefined) updateFields.intervalMonths = input.intervalMonths;
  if (input.isActive !== undefined) updateFields.isActive = input.isActive;
  if (input.description !== undefined) updateFields.description = input.description;

  const res = await db
    .collection(SUBSCRIPTION_PLANS_COLLECTION)
    .findOneAndUpdate(
      { id: planId },
      { $set: updateFields },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

  if (res) {
    await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
      id: `audit_${randomUUID()}`,
      timestamp: new Date(),
      actorId,
      action: 'subscription_plan.updated',
      targetType: 'subscription_plan',
      targetId: planId,
      metadata: { previous: existing, updated: updateFields },
    });
  }

  return res ? SubscriptionPlanDefinitionSchema.parse(res) : null;
}

export async function deleteSubscriptionPlan(
  db: Db,
  planId: string,
  actorId: string
): Promise<boolean> {
  const existing = await findSubscriptionPlanById(db, planId);
  if (!existing) return false;

  const res = await db.collection(SUBSCRIPTION_PLANS_COLLECTION).deleteOne({ id: planId });
  if (res.deletedCount > 0) {
    await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
      id: `audit_${randomUUID()}`,
      timestamp: new Date(),
      actorId,
      action: 'subscription_plan.deleted',
      targetType: 'subscription_plan',
      targetId: planId,
      metadata: { deletedPlan: existing },
    });
    return true;
  }
  return false;
}
