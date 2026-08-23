create table if not exists public.product_searches (
  id text primary key,
  provider text not null,
  query text not null,
  canonical_key text not null,
  intent_category text,
  intent_garment_type text,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_searches_provider_query_idx
  on public.product_searches (provider, query);

create index if not exists product_searches_canonical_key_idx
  on public.product_searches (canonical_key);

create index if not exists product_searches_expires_at_idx
  on public.product_searches (expires_at);

alter table public.product_searches enable row level security;

create table if not exists public.products (
  id text primary key,
  provider_product_id text,
  retailer text not null,
  brand text,
  title text not null,
  price numeric,
  currency text,
  image_url text,
  product_url text not null,
  availability text,
  category text,
  garment_type text,
  colors text[] not null default '{}',
  materials text[] not null default '{}',
  aesthetics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_product_url_idx
  on public.products (product_url);

create index if not exists products_retailer_idx
  on public.products (retailer);

create index if not exists products_category_idx
  on public.products (category);

create index if not exists products_garment_type_idx
  on public.products (garment_type);

alter table public.products enable row level security;

create table if not exists public.product_search_results (
  search_id text not null references public.product_searches(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  position integer not null,
  raw_score numeric,
  source_rank integer,
  created_at timestamptz not null default now(),
  primary key (search_id, product_id)
);

create index if not exists product_search_results_search_position_idx
  on public.product_search_results (search_id, position);

create index if not exists product_search_results_product_idx
  on public.product_search_results (product_id);

alter table public.product_search_results enable row level security;
