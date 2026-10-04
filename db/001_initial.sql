CREATE TABLE IF NOT EXISTS finance_fact (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL CHECK (period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  entity TEXT NOT NULL,
  department TEXT NOT NULL,
  product TEXT NOT NULL,
  account TEXT NOT NULL CHECK (account IN ('Revenue','Personnel','Marketing','Technology','General & Administrative','FTE','Listings','Subscriptions')),
  version TEXT NOT NULL CHECK (version IN ('Actual','Budget','Forecast')),
  amount NUMERIC(18,2) NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('EUR','FTE','count')),
  dataset_version TEXT NOT NULL,
  UNIQUE(period, entity, department, product, account, version)
);
CREATE INDEX IF NOT EXISTS finance_fact_slice ON finance_fact(period, entity, version);
CREATE TABLE IF NOT EXISTS scenario (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  name TEXT NOT NULL,
  assumptions JSONB NOT NULL,
  results JSONB NOT NULL,
  data_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scenario_session ON scenario(session_id, created_at DESC);
CREATE TABLE IF NOT EXISTS ai_usage (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_session_time ON ai_usage(session_id, created_at);
CREATE TABLE IF NOT EXISTS load_audit (
  dataset_version TEXT PRIMARY KEY,
  row_count INTEGER NOT NULL,
  reconciled BOOLEAN NOT NULL,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
