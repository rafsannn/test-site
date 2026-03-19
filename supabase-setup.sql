-- =============================================
-- ZENOCART - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- =============================================

create table if not exists products (
  id           bigserial primary key,
  name         text not null,
  short_name   text,
  category     text,
  category_slug text,
  price        numeric(10,2) not null default 0,
  old_price    numeric(10,2),
  rating       numeric(3,1) default 5.0,
  sold         integer default 0,
  badge        text check (badge in ('hot','new','sale') or badge is null),
  image        text,
  images       jsonb default '[]',
  description  text,
  specs        jsonb default '[]',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Allow public read (so the storefront can fetch products)
alter table products enable row level security;

create policy "Public can read products"
  on products for select
  using (true);

create policy "Service role can do everything"
  on products for all
  using (true);

-- Optional: seed demo products
insert into products (name, short_name, category, category_slug, price, old_price, rating, sold, badge, image, images, description, specs) values
('Charging Portable Mini Fan - Bear Edition', 'Mini USB Portable Fan', 'Mini Fans', 'fans', 650, 850, 4.8, 9400, 'hot', 'images/product-fan.jpg', '["images/product-fan.jpg"]', 'Stay cool anywhere with this adorable bear-themed portable fan.', '[{"label":"Type","value":"USB Rechargeable"},{"label":"Speeds","value":"3 Speed Settings"}]'),
('20000mAh Power Bank Fast Charging', '20000mAh Power Bank', 'Power Banks', 'powerbanks', 1250, 1600, 4.9, 2900, 'new', 'images/product-powerbank.jpg', '["images/product-powerbank.jpg"]', '20000mAh large capacity power bank with 20W fast charging.', '[{"label":"Capacity","value":"20000mAh"}]'),
('Luminous Waterproof Men Watch - Black', 'Men Stainless Steel Watch', 'Watches', 'watches', 1850, 2400, 5.0, 951, 'sale', 'images/product-watch.jpg', '["images/product-watch.jpg"]', 'Stainless steel waterproof watch with luminous hands.', '[{"label":"Material","value":"Stainless Steel"}]');
