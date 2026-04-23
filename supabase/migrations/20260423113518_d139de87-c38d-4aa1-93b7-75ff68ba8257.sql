
-- Quarters
CREATE TABLE public.quarters (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segments
CREATE TABLE public.segments (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery types
CREATE TABLE public.delivery_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  quarter_id TEXT,
  owner_id TEXT,
  participant_ids TEXT[] NOT NULL DEFAULT '{}',
  due_date TEXT,
  start_date TEXT,
  delay_reason TEXT,
  new_quarter_id TEXT,
  segment_ids TEXT[] NOT NULL DEFAULT '{}',
  delivery_type_id TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger pro tasks
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Public access policies (heslový gate v UI)
CREATE POLICY "public_all_quarters" ON public.quarters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_segments" ON public.segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_delivery_types" ON public.delivery_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.quarters REPLICA IDENTITY FULL;
ALTER TABLE public.members REPLICA IDENTITY FULL;
ALTER TABLE public.segments REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_types REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.quarters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
