/** Server-only helpers for the private `property-images` bucket. */

export const PROPERTY_BUCKET = "property-images";

const SIGN_TTL = 60 * 60; // 1 hour

/** True when the value is a storage object path (not an external/static URL). */
export function isStoragePath(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/^(https?:)?\/\//.test(value) && !value.startsWith("/") && !value.startsWith("data:");
}

/** Service-role access is required to manage (create) the private bucket. */
export function hasServiceRole() {
  return Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrls: (paths: string[], ttl: number) => Promise<{ data: Array<{ path: string | null; signedUrl: string }> | null }>;
      remove: (paths: string[]) => Promise<unknown>;
    };
  };
};

/**
 * Storage client used for signing/removing objects. Prefers the service-role
 * client, and falls back to the caller's authenticated client (staff storage
 * policies allow it) so images still work when no service key is configured.
 */
async function storageClient(fallback?: unknown): Promise<StorageClient | null> {
  if (hasServiceRole()) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin as unknown as StorageClient;
  }
  if (fallback) return fallback as StorageClient;
  // Public/anonymous reads (website visitors): the publishable client can create
  // signed URLs thanks to the anon SELECT storage policy on the bucket.
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  }) as unknown as StorageClient;
}

export async function ensurePropertyBucket() {
  if (!hasServiceRole()) return { created: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.getBucket(PROPERTY_BUCKET);
  if (data) return { created: false };
  const { error } = await supabaseAdmin.storage.createBucket(PROPERTY_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  return { created: true };
}

/** Maps storage paths to signed URLs; non-storage values pass through unchanged. */
export async function signPaths(values: Array<string | null | undefined>, client?: unknown) {
  const map = new Map<string, string>();
  const paths = [...new Set(values.filter(isStoragePath))];
  const signer = await storageClient(client);
  if (paths.length === 0 || !signer) return map;

  const { data } = await signer.storage.from(PROPERTY_BUCKET).createSignedUrls(paths, SIGN_TTL);

  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

/** Deletes storage objects; ignores external URLs and never throws. */
export async function removeStorageObjects(values: Array<string | null | undefined>, client?: unknown) {
  const paths = [...new Set(values.filter(isStoragePath))];
  const remover = await storageClient(client);
  if (paths.length === 0 || !remover) return { removed: 0 };
  await remover.storage.from(PROPERTY_BUCKET).remove(paths);
  return { removed: paths.length };
}



type WithImages = { images?: string[] | null; featured_image?: string | null };

/** Rewrites `images` / `featured_image` on rows so clients get displayable URLs. */
export async function withSignedImages<T extends WithImages>(rows: T[], client?: unknown): Promise<T[]> {
  const all: Array<string | null | undefined> = [];
  for (const row of rows) {
    all.push(row.featured_image);
    for (const img of row.images ?? []) all.push(img);
  }
  const map = await signPaths(all, client);

  if (map.size === 0) return rows;

  return rows.map((row) => ({
    ...row,
    featured_image: row.featured_image ? (map.get(row.featured_image) ?? row.featured_image) : row.featured_image,
    images: (row.images ?? []).map((img) => map.get(img) ?? img),
  }));
}
