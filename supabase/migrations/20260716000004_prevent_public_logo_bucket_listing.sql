-- Public object URLs remain available because the bucket itself is public.
-- Removing this policy prevents anonymous clients from listing every logo path.
drop policy if exists "company-logos public read" on storage.objects;
