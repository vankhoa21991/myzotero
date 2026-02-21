-- MyZotero Supabase schema (Phase 5)
-- Run in Supabase SQL editor. RLS scoped to auth.uid().

-- Items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  doi TEXT,
  type TEXT NOT NULL DEFAULT 'webpage',
  abstract TEXT,
  date_added BIGINT NOT NULL,
  date_modified BIGINT NOT NULL,
  creators JSONB NOT NULL DEFAULT '[]',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_user_date ON items(user_id, date_added DESC);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY items_policy ON items FOR ALL USING (auth.uid() = user_id);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  date_added BIGINT NOT NULL,
  date_modified BIGINT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collections_user_parent ON collections(user_id, parent_id);
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY collections_policy ON collections FOR ALL USING (auth.uid() = user_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name ON tags(user_id, name);
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_policy ON tags FOR ALL USING (auth.uid() = user_id);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  storage_path TEXT,
  size BIGINT NOT NULL,
  date_added BIGINT NOT NULL,
  date_modified BIGINT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attachments_item ON attachments(item_id);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY attachments_policy ON attachments FOR ALL USING (auth.uid() = user_id);

-- Annotations
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  page INT NOT NULL,
  position JSONB NOT NULL DEFAULT '{}',
  content TEXT,
  color TEXT,
  date_added BIGINT NOT NULL,
  date_modified BIGINT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS annotations_attachment ON annotations(attachment_id);
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY annotations_policy ON annotations FOR ALL USING (auth.uid() = user_id);

-- Junction: collection_items
CREATE TABLE IF NOT EXISTS collection_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  date_added BIGINT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, item_id)
);

CREATE INDEX IF NOT EXISTS collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS collection_items_item ON collection_items(item_id);
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_items_policy ON collection_items FOR ALL USING (auth.uid() = user_id);

-- Junction: item_tags
CREATE TABLE IF NOT EXISTS item_tags (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS item_tags_tag ON item_tags(tag_id);
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_tags_policy ON item_tags FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for PDFs (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);
-- RLS policies for storage.objects: allow read/write where auth.uid() = owner
