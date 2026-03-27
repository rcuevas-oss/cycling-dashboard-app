-- Bootstrap minimo para habilitar la subida de archivos .fit en Supabase Storage.
-- Ejecutar en el SQL Editor del proyecto correcto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fit-files',
  'fit-files',
  false,
  26214400,
  array['application/octet-stream', 'application/vnd.ant.fit']
)
on conflict (id) do nothing;

drop policy if exists "fit-files_upload_own" on storage.objects;
create policy "fit-files_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "fit-files_select_own" on storage.objects;
create policy "fit-files_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "fit-files_delete_own" on storage.objects;
create policy "fit-files_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
