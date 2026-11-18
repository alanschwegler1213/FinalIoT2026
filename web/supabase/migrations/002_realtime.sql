-- La web (clave anon) solo puede leer; escribir sigue siendo exclusivo del backend.
create policy "lectura publica" on public.lecturas for select to anon using (true);

alter publication supabase_realtime add table public.lecturas;
