-- À coller dans Supabase > SQL Editor > Run
create table if not exists creators (
  id bigint generated always as identity primary key,
  name text not null,
  platform text default 'youtube',
  url text,
  email text,
  niche text,
  audience bigint default 0,
  status text default 'new',
  notes text,
  step int default 0,
  last_sent_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists sequence (
  step int primary key,
  delay_days int default 0,
  subject text,
  body text
);
create table if not exists settings (key text primary key, value text);
create table if not exists messages (
  id bigint generated always as identity primary key,
  creator_id bigint,
  step int,
  channel text default 'email',
  subject text,
  body text,
  ok boolean default true,
  error text,
  sent_at timestamptz default now()
);
alter table creators enable row level security;
alter table sequence enable row level security;
alter table settings enable row level security;
alter table messages enable row level security;

insert into sequence (step, delay_days, subject, body) values
(1, 0, 'Collab {{produit}} x {{chaine}} ?', E'Salut {{prenom}},\n\nJ''ai découvert ta chaîne {{chaine}} et j''aime beaucoup ton contenu.\n\nJe fonde {{produit}} et je pense que ça parlerait à ton audience. Je te propose de tester l''outil gratuitement, et si ça te plaît, on peut monter une collab (commission sur les inscriptions ou vidéo sponsorisée, à voir ensemble).\n\nÇa t''intéresse d''en discuter ? {{lien}}\n\n{{expediteur}}'),
(2, 3, 'Re: Collab {{produit}} x {{chaine}} ?', E'Salut {{prenom}},\n\nPetite relance sur mon message précédent. Je peux t''envoyer un accès gratuit complet pour que tu te fasses ton avis, sans engagement.\n\n{{expediteur}}'),
(3, 5, 'Dernière relance : {{produit}}', E'Salut {{prenom}},\n\nDernier message de ma part, je ne veux pas t''embêter. Si une collab t''intéresse un jour, ma porte reste ouverte.\n\n{{expediteur}}')
on conflict (step) do nothing;

insert into settings (key, value) values
('daily_cap', '30'),
('footer', 'Pour ne plus recevoir mes messages, réponds simplement « STOP ».'),
('apify_tiktok_actor', 'clockworks/tiktok-scraper'),
('apify_tiktok_input', '{"hashtags":["{{q}}"],"resultsPerPage":20}'),
('apify_instagram_actor', 'apify/instagram-hashtag-scraper'),
('apify_instagram_input', '{"hashtags":["{{q}}"],"resultsLimit":20}'),
('apify_linkedin_actor', ''),
('apify_linkedin_input', '{"searchQuery":"{{q}}"}'),
('apify_x_actor', ''),
('apify_x_input', '{"searchTerms":["{{q}}"]}')
on conflict (key) do nothing;
