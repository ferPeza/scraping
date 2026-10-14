# Negocios de Monclova

1. En Supabase > SQL Editor, ejecuta `supabase/schema.sql`.
2. Copia `.env.example` a `.env.local` y llena las dos variables (Settings > API).
3. Carga los datos: ver `scripts/cargar_denue.py` (usa la service_role key, solo en tu equipo).
4. `npm install` y `npm run dev`.
5. Despliegue: sube a GitHub, importa en Vercel y agrega las dos variables de entorno.
