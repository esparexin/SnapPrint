import { Db } from 'mongodb';
import {
  Studio,
  StudioIdSchema,
  StudioSchema,
  StudioSettings,
  StudioSettingsSchema,
  StudioStatus,
  StudioStatusSchema,
  z,
} from '@snapprint/contracts';

export const STUDIOS_COLLECTION = 'studios';

export interface StudioDocument {
  id: string;
  slug: string;
  name: string;
  status: StudioStatus;
  settings: StudioSettings;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateStudioInputSchema = z.object({
  id: StudioIdSchema,
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  status: StudioStatusSchema.optional().default('active'),
  settings: StudioSettingsSchema.optional().default({
    currency: 'INR',
    maxActivePrinters: 2,
    autoApproveOrders: false,
  }),
});

export type CreateStudioInput = z.input<typeof CreateStudioInputSchema>;

export function toStudioContract(doc: StudioDocument): Studio {
  return StudioSchema.parse({
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    status: doc.status,
    settings: doc.settings,
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

export async function createStudio(db: Db, input: CreateStudioInput): Promise<Studio> {
  const validated = CreateStudioInputSchema.parse(input);
  const now = new Date();

  const doc: StudioDocument = {
    id: validated.id,
    slug: validated.slug,
    name: validated.name,
    status: validated.status,
    settings: validated.settings,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<StudioDocument>(STUDIOS_COLLECTION).insertOne(doc);
  return toStudioContract(doc);
}

export async function findStudioById(db: Db, id: string): Promise<Studio | null> {
  const doc = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });

  return doc ? toStudioContract(doc) : null;
}

export async function findStudioBySlug(db: Db, slug: string): Promise<Studio | null> {
  const parsedSlug = StudioSchema.shape.slug.safeParse(slug);
  if (!parsedSlug.success) {
    return null;
  }

  const doc = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .findOne({ slug: parsedSlug.data }, { projection: { _id: 0 } });

  return doc ? toStudioContract(doc) : null;
}

export async function findStudiosByIds(db: Db, ids: string[]): Promise<Studio[]> {
  if (ids.length === 0) return [];
  const docs = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .find({ id: { $in: ids } }, { projection: { _id: 0 } })
    .toArray();

  return docs.map(toStudioContract);
}

export async function updateStudioSettings(
  db: Db,
  id: string,
  settings: Partial<StudioSettings>
): Promise<Studio | null> {
  const current = await findStudioById(db, id);
  if (!current) return null;

  const mergedSettings = StudioSettingsSchema.parse({
    ...current.settings,
    ...settings,
  });

  const now = new Date();
  await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .updateOne({ id }, { $set: { settings: mergedSettings, updatedAt: now } });

  return findStudioById(db, id);
}

export async function updateStudioStatus(
  db: Db,
  id: string,
  status: StudioStatus
): Promise<boolean> {
  const result = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .updateOne({ id }, { $set: { status, updatedAt: new Date() } });

  return result.matchedCount > 0;
}
