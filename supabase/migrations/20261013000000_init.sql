create table if not exists negocios (
  id text primary key,
  nombre text,
  razon_social text,
  actividad text,
  direccion text,
  colonia text,
  cp text,
  telefono text,
  correo text,
  sitio_web text,
  latitud float8,
  longitud float8
);

alter table negocios enable row level security;

create policy "lectura publica" on negocios
  for select using (true);
