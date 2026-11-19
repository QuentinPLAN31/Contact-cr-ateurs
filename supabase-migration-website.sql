-- Si tu as déjà exécuté supabase.sql, exécute seulement cette ligne :
alter table creators add column if not exists website text;
