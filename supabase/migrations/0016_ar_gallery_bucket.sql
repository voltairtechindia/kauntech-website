-- =====================================================================
-- Storage: public `ar-gallery` bucket (curated AR models for the /ar editor)
-- =====================================================================
-- The bucket was originally created by hand in the Supabase dashboard, so its
-- config lived only in prod and wasn't reproducible from migrations. This
-- records it: public read (model-viewer / the editor fetch .glb + catalog.json
-- over plain HTTPS), a 50 MB per-file ceiling (matches the admin uploader's
-- MAX_BYTES in kauntech-admin `/api/ar-gallery`), and a MIME allowlist of just
-- the two content types this bucket ever holds — .glb models and catalog.json.
--
-- Writes happen via the service-role key (kauntech-admin mints a signed upload
-- URL and finalizes), which bypasses RLS, so no object write policy is needed;
-- public read is inherent to a public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'ar-gallery',
    'ar-gallery',
    true,
    52428800,
    array['model/gltf-binary', 'application/json']
)
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
