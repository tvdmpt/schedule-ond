-- Run once in Neon Console → SQL Editor.
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  telegram_user_id TEXT UNIQUE,
  surname TEXT NOT NULL,
  first_name TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishes (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  days JSONB NOT NULL,
  restriction_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_start)
);

CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  work_date DATE NOT NULL,
  point TEXT NOT NULL CHECK (point IN ('Верхние Котлы-01','Верхние Котлы-03','ЗИЛ')),
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS schedule_publications (
  id BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wishes_week_idx ON wishes(week_start);
CREATE INDEX IF NOT EXISTS assignments_week_idx ON assignments(week_start);