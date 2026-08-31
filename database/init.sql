CREATE SCHEMA IF NOT EXISTS analytics;

DO $$ BEGIN
  CREATE TYPE app_user_role AS ENUM ('ADMIN', 'EXECUTIVE', 'SALES_MANAGER', 'ANALYST', 'SALES_REP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS app_user (
  user_id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role app_user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_app_user_email ON app_user(email);

CREATE TABLE IF NOT EXISTS analytics.dim_date (
  date_key INTEGER PRIMARY KEY,
  full_date DATE NOT NULL UNIQUE,
  day_of_month SMALLINT NOT NULL,
  month_number SMALLINT NOT NULL,
  month_name VARCHAR(12) NOT NULL,
  quarter_number SMALLINT NOT NULL,
  year_number SMALLINT NOT NULL,
  week_number SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_region (
  region_key BIGSERIAL PRIMARY KEY,
  region_code VARCHAR(32) NOT NULL UNIQUE,
  region_name VARCHAR(120) NOT NULL,
  country_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_category (
  category_key BIGSERIAL PRIMARY KEY,
  category_name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_product (
  product_key BIGSERIAL PRIMARY KEY,
  product_sku VARCHAR(64) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  category_key BIGINT REFERENCES analytics.dim_category(category_key),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_customer (
  customer_key BIGSERIAL PRIMARY KEY,
  customer_external_id VARCHAR(64) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_salesperson (
  salesperson_key BIGSERIAL PRIMARY KEY,
  employee_code VARCHAR(64) NOT NULL UNIQUE,
  salesperson_name VARCHAR(255) NOT NULL,
  region_key BIGINT REFERENCES analytics.dim_region(region_key),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_store (
  store_key BIGSERIAL PRIMARY KEY,
  store_code VARCHAR(64) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  region_key BIGINT NOT NULL REFERENCES analytics.dim_region(region_key),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.fact_sales (
  sales_key BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  date_key INTEGER NOT NULL REFERENCES analytics.dim_date(date_key),
  customer_key BIGINT NOT NULL REFERENCES analytics.dim_customer(customer_key),
  product_key BIGINT NOT NULL REFERENCES analytics.dim_product(product_key),
  region_key BIGINT NOT NULL REFERENCES analytics.dim_region(region_key),
  salesperson_key BIGINT REFERENCES analytics.dim_salesperson(salesperson_key),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  gross_revenue NUMERIC(14,2) NOT NULL CHECK (gross_revenue >= 0),
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  profit_amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fact_sales_date_region ON analytics.fact_sales(date_key, region_key);
CREATE INDEX IF NOT EXISTS ix_fact_sales_product ON analytics.fact_sales(product_key);

CREATE TABLE IF NOT EXISTS analytics.fact_returns (
  return_key BIGSERIAL PRIMARY KEY,
  sales_key BIGINT NOT NULL REFERENCES analytics.fact_sales(sales_key),
  date_key INTEGER NOT NULL REFERENCES analytics.dim_date(date_key),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  return_amount NUMERIC(14,2) NOT NULL CHECK (return_amount >= 0),
  return_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fact_returns_date ON analytics.fact_returns(date_key);

CREATE TABLE IF NOT EXISTS analytics.fact_inventory (
  inventory_key BIGSERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL REFERENCES analytics.dim_date(date_key),
  product_key BIGINT NOT NULL REFERENCES analytics.dim_product(product_key),
  store_key BIGINT NOT NULL REFERENCES analytics.dim_store(store_key),
  quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
  reorder_point INTEGER NOT NULL CHECK (reorder_point >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date_key, product_key, store_key)
);

CREATE TABLE IF NOT EXISTS analytics.fact_targets (
  target_key BIGSERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL REFERENCES analytics.dim_date(date_key),
  region_key BIGINT REFERENCES analytics.dim_region(region_key),
  salesperson_key BIGINT REFERENCES analytics.dim_salesperson(salesperson_key),
  product_key BIGINT REFERENCES analytics.dim_product(product_key),
  target_revenue NUMERIC(14,2) NOT NULL CHECK (target_revenue >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (region_key IS NOT NULL OR salesperson_key IS NOT NULL OR product_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_fact_targets_date_region ON analytics.fact_targets(date_key, region_key);

CREATE OR REPLACE VIEW analytics.v_daily_sales AS
SELECT d.full_date, r.region_name, SUM(s.gross_revenue - s.discount_amount) AS revenue,
       SUM(s.profit_amount) AS profit, COUNT(DISTINCT s.order_id) AS orders
FROM analytics.fact_sales s
JOIN analytics.dim_date d ON d.date_key = s.date_key
JOIN analytics.dim_region r ON r.region_key = s.region_key
GROUP BY d.full_date, r.region_name;
