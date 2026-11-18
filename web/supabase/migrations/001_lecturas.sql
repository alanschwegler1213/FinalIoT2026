create table public.lecturas (
  id bigint generated always as identity primary key,
  dispositivo text not null,
  crudo integer not null check (crudo between 0 and 4095),
  medido_en timestamptz not null,
  creado_en timestamptz not null default now(),
  unique (dispositivo, medido_en)
);

-- RLS activo y sin políticas: solo el backend (service role) lee y escribe.
-- Al construir la PWA con Realtime se agrega una política de SELECT.
alter table public.lecturas enable row level security;

create index lecturas_medido_en_idx on public.lecturas (dispositivo, medido_en desc);
