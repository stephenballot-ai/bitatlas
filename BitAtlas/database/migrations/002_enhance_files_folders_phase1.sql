-- BitAtlas Phase 1 Enhancements Migration
-- Migration: 002_enhance_files_folders_phase1.sql

-- Add materialized path to folders for better performance (VP recommendation)
ALTER TABLE folders ADD COLUMN materialized_path TEXT;
ALTER TABLE folders ADD COLUMN depth INTEGER DEFAULT 0;
ALTER TABLE folders ADD COLUMN file_count INTEGER DEFAULT 0;
ALTER TABLE folders ADD COLUMN subfolder_count INTEGER DEFAULT 0;

-- Add folder_id to files table to support folder hierarchy
ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES folders(id);

-- Add soft delete support enhancements
ALTER TABLE files ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Add file preview support
CREATE TABLE file_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  preview_type VARCHAR(20) NOT NULL, -- 'thumbnail', 'text', 'image'
  preview_data JSONB,
  storage_key TEXT, -- For storing preview files in S3/storage
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- For cache expiration
);

-- Create indexes for new columns
CREATE INDEX idx_folders_materialized_path ON folders(materialized_path);
CREATE INDEX idx_folders_depth ON folders(depth);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_is_deleted ON files(is_deleted);
CREATE INDEX idx_file_previews_file_id ON file_previews(file_id);
CREATE INDEX idx_file_previews_type ON file_previews(preview_type);
CREATE INDEX idx_file_previews_expires_at ON file_previews(expires_at);

-- Function to update folder materialized path
CREATE OR REPLACE FUNCTION update_folder_materialized_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT := '';
  parent_depth INTEGER := 0;
BEGIN
  -- Get parent path and depth
  IF NEW.parent_id IS NOT NULL THEN
    SELECT materialized_path, depth INTO parent_path, parent_depth
    FROM folders WHERE id = NEW.parent_id;
    
    NEW.materialized_path := parent_path || '/' || NEW.id::text;
    NEW.depth := parent_depth + 1;
  ELSE
    NEW.materialized_path := NEW.id::text;
    NEW.depth := 0;
  END IF;
  
  -- Enforce maximum depth (VP recommendation: max 5 levels)
  IF NEW.depth > 5 THEN
    RAISE EXCEPTION 'Maximum folder depth of 5 levels exceeded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update materialized path
CREATE TRIGGER update_folder_materialized_path_trigger
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_folder_materialized_path();

-- Function to update folder counts
CREATE OR REPLACE FUNCTION update_folder_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update file count for folder
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE folders 
    SET file_count = (
      SELECT COUNT(*) FROM files 
      WHERE folder_id = NEW.folder_id AND is_deleted = FALSE
    )
    WHERE id = NEW.folder_id;
  END IF;
  
  -- Update file count for old folder on move
  IF TG_OP = 'UPDATE' AND OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
    UPDATE folders 
    SET file_count = (
      SELECT COUNT(*) FROM files 
      WHERE folder_id = OLD.folder_id AND is_deleted = FALSE
    )
    WHERE id = OLD.folder_id;
  END IF;
  
  -- Update file count for folder on delete
  IF TG_OP = 'DELETE' THEN
    UPDATE folders 
    SET file_count = (
      SELECT COUNT(*) FROM files 
      WHERE folder_id = OLD.folder_id AND is_deleted = FALSE
    )
    WHERE id = OLD.folder_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update folder file counts
CREATE TRIGGER update_folder_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION update_folder_counts();

-- Function to update folder subfolder counts
CREATE OR REPLACE FUNCTION update_subfolder_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subfolder count for parent folder
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE folders 
    SET subfolder_count = (
      SELECT COUNT(*) FROM folders 
      WHERE parent_id = NEW.parent_id
    )
    WHERE id = NEW.parent_id;
  END IF;
  
  -- Update subfolder count for old parent on move
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    UPDATE folders 
    SET subfolder_count = (
      SELECT COUNT(*) FROM folders 
      WHERE parent_id = OLD.parent_id
    )
    WHERE id = OLD.parent_id;
  END IF;
  
  -- Update subfolder count for parent on delete
  IF TG_OP = 'DELETE' THEN
    UPDATE folders 
    SET subfolder_count = (
      SELECT COUNT(*) FROM folders 
      WHERE parent_id = OLD.parent_id
    )
    WHERE id = OLD.parent_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update subfolder counts
CREATE TRIGGER update_subfolder_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_subfolder_counts();

-- Initialize materialized_path for existing folders (if any)
UPDATE folders 
SET materialized_path = id::text, 
    depth = 0 
WHERE parent_id IS NULL AND materialized_path IS NULL;

-- Set is_deleted based on existing deleted_at column
UPDATE files 
SET is_deleted = TRUE 
WHERE deleted_at IS NOT NULL AND is_deleted = FALSE;