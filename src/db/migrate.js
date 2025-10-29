const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 * @param {string} dbPath - Path to SQLite database file
 */
function runMigrations(dbPath) {
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Run each migration
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      db.exec(sql);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Check if database needs initialization
 * @param {string} dbPath - Path to SQLite database file
 * @returns {boolean} - True if database needs initialization
 */
function needsInitialization(dbPath) {
  try {
    const db = new Database(dbPath);
    
    // Check if tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('skills', 'content_analyses', 'skill_versions', 'skill_usage')
    `).all();

    db.close();
    
    return tables.length === 0;
  } catch (error) {
    // Database file doesn't exist or is corrupted
    return true;
  }
}

module.exports = {
  runMigrations,
  needsInitialization
};
