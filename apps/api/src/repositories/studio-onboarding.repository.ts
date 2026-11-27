import { Db } from 'mongodb';
import { CreateShopRequest, ShopPaymentSettings } from '@snapprint/contracts';
import { createUserMembership } from './membership.repository.js';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';

export async function createStudioWithOnboarding(
  db: Db,
  input: CreateShopRequest,
  ownerUserId: string
): Promise<StudioDocument> {
  const now = new Date();
  const id = `studio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const doc: StudioDocument = {
    id,
    slug: input.slug,
    name: input.name,
    status: 'onboarding',
    ownerUserId,
    tagline: input.tagline,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    location: input.location,
    workingHours: input.workingHours,
    capabilities: input.capabilities,
    payment: input.payment,
    settings: {
      currency: 'INR',
      autoApproveOrders: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<StudioDocument>(STUDIOS_COLLECTION).insertOne(doc);
  await createUserMembership(db, {
    userId: ownerUserId,
    studioId: id,
    role: 'studio_owner',
    status: 'active',
  });

  return doc;
}

export async function findStudioDocumentById(db: Db, id: string): Promise<StudioDocument | null> {
  return db.collection<StudioDocument>(STUDIOS_COLLECTION).findOne({ id });
}

export async function findStudiosByOwnerUserId(
  db: Db,
  ownerUserId: string
): Promise<StudioDocument[]> {
  return db.collection<StudioDocument>(STUDIOS_COLLECTION).find({ ownerUserId }).toArray();
}

export async function updateStudioOnboardingProfile(
  db: Db,
  id: string,
  updates: Partial<CreateShopRequest>
): Promise<StudioDocument | null> {
  const current = await findStudioDocumentById(db, id);
  if (!current) return null;

  const now = new Date();
  const setPayload: Partial<StudioDocument> = {
    updatedAt: now,
  };

  if (updates.name) setPayload.name = updates.name;
  if (updates.slug) setPayload.slug = updates.slug;
  if (updates.tagline !== undefined) setPayload.tagline = updates.tagline;
  if (updates.contactPhone !== undefined) setPayload.contactPhone = updates.contactPhone;
  if (updates.contactEmail !== undefined) setPayload.contactEmail = updates.contactEmail;
  if (updates.location) {
    setPayload.location = { ...current.location, ...updates.location } as NonNullable<
      StudioDocument['location']
    >;
  }
  if (updates.workingHours) {
    setPayload.workingHours = {
      ...current.workingHours,
      ...updates.workingHours,
    } as NonNullable<StudioDocument['workingHours']>;
  }
  if (updates.capabilities) {
    setPayload.capabilities = {
      ...current.capabilities,
      ...updates.capabilities,
    } as NonNullable<StudioDocument['capabilities']>;
  }
  if (updates.payment) {
    setPayload.payment = {
      ...current.payment,
      ...updates.payment,
    } as NonNullable<StudioDocument['payment']>;
  }

  await db.collection<StudioDocument>(STUDIOS_COLLECTION).updateOne({ id }, { $set: setPayload });

  return findStudioDocumentById(db, id);
}

export async function updateStudioRazorpayVerification(
  db: Db,
  id: string,
  isConfirmed: boolean,
  keyId?: string,
  keySecret?: string
): Promise<boolean> {
  const current = await findStudioDocumentById(db, id);
  if (!current) return false;

  const payment: ShopPaymentSettings = {
    enableCounterPayment: true,
    ...current.payment,
    enableOnlinePayment: isConfirmed,
    isRazorpayConfirmed: isConfirmed,
    ...(keyId ? { razorpayKeyId: keyId } : {}),
  };

  const updateFields: Record<string, unknown> = {
    payment,
    'settings.onlinePaymentEnabled': isConfirmed,
    updatedAt: new Date(),
  };
  if (keySecret) {
    updateFields.razorpayKeySecret = keySecret;
  }

  const result = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .updateOne({ id }, { $set: updateFields });

  return result.matchedCount > 0;
}

export async function activateStudio(db: Db, id: string): Promise<boolean> {
  const result = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .updateOne({ id }, { $set: { status: 'active', updatedAt: new Date() } });

  return result.matchedCount > 0;
}
