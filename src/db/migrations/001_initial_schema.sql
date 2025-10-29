-- Initial schema migration for Claude Skills Factory
-- This creates all required tables with proper indexes and constraints

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  skill_type VARCHAR(100) NOT NULL CHECK (skill_type IN ('copywriting', 'process', 'technical')),
  version INTEGER DEFAULT 1 NOT NULL,
  main_content TEXT NOT NULL,
  `references` JSON NOT NULL DEFAULT '{}',
  metadata JSON NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for skills table
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(skill_type);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

-- Create content_analyses table
CREATE TABLE IF NOT EXISTS content_analyses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  skill_id INTEGER,
  source_content TEXT NOT NULL,
  content_type VARCHAR(100) NOT NULL CHECK (content_type IN ('copywriting', 'process', 'technical')),
  analysis_result JSON NOT NULL,
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  processing_time REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL
);

-- Indexes for content_analyses table
CREATE INDEX IF NOT EXISTS idx_content_analyses_skill_id ON content_analyses(skill_id);
CREATE INDEX IF NOT EXISTS idx_content_analyses_created_at ON content_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_analyses_type ON content_analyses(content_type);

-- Create skill_versions table
CREATE TABLE IF NOT EXISTS skill_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  main_content TEXT NOT NULL,
  `references` JSON NOT NULL DEFAULT '{}',
  metadata JSON NOT NULL DEFAULT '{}',
  change_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(skill_id, version)
);

-- Indexes for skill_versions table
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_id ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_versions_version ON skill_versions(skill_id, version DESC);

-- Create skill_usage table
CREATE TABLE IF NOT EXISTS skill_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL,
  usage_context TEXT,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  improvement_notes TEXT,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Indexes for skill_usage table
CREATE INDEX IF NOT EXISTS idx_skill_usage_skill_id ON skill_usage(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_usage_used_at ON skill_usage(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_usage_rating ON skill_usage(feedback_rating);
