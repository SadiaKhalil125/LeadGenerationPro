"""
Database Schema Management - Handles API sources table and tasks table extensions
Designed for backward compatibility and safe migrations
"""

import logging
from routers.get_db_connection import get_db_cursor

logger = logging.getLogger(__name__)


def create_api_sources_table():
    """Create api_sources table if it doesn't exist"""
    conn, cur = get_db_cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS api_sources (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                api_url VARCHAR(1000) NOT NULL,
                api_key VARCHAR(1000),
                
                request_template JSONB NOT NULL DEFAULT '{"method":"GET","headers":{},"params":{},"body":{}}',
                response_structure JSONB NOT NULL DEFAULT '{"data_path":"data"}',
                data_extraction_path VARCHAR(255) NOT NULL DEFAULT 'data',
                
                entity_name VARCHAR(255) NOT NULL,
                field_mappings JSONB NOT NULL DEFAULT '[]',
                
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Create index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_sources_entity 
            ON api_sources(entity_name);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_sources_name 
            ON api_sources(name);
        """)
        
        conn.commit()
        logger.info("✅ api_sources table created successfully")
        
    except Exception as e:
        logger.error(f"❌ Error creating api_sources table: {str(e)}")
        conn.rollback()
    finally:
        cur.close()


def extend_tasks_table():
    """Extend tasks table with source_type and api_source_id columns"""
    conn, cur = get_db_cursor()
    try:
        # Add source_type column if it doesn't exist
        cur.execute("""
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'web';
        """)
        
        # Add api_source_id column if it doesn't exist
        cur.execute("""
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS api_source_id INT;
        """)
        
        # Make mapping_id nullable (allow NULL for API tasks)
        cur.execute("""
            ALTER TABLE tasks 
            ALTER COLUMN mapping_id DROP NOT NULL;
        """)
        
        # Add foreign key constraint for api_source_id if it doesn't exist
        try:
            cur.execute("""
                ALTER TABLE tasks 
                ADD CONSTRAINT fk_api_source 
                FOREIGN KEY (api_source_id) REFERENCES api_sources(id) ON DELETE SET NULL;
            """)
        except Exception as fk_err:
            if "already exists" not in str(fk_err):
                logger.warning(f"⚠️  FK constraint warning: {str(fk_err)}")
        
        # Add check constraint to ensure valid combinations
        # This allows: (source_type='web' AND mapping_id IS NOT NULL) OR (source_type='api' AND api_source_id IS NOT NULL)
        try:
            cur.execute("""
                ALTER TABLE tasks 
                ADD CONSTRAINT valid_task_source CHECK (
                    (source_type = 'web' AND source_id IS NOT NULL AND mapping_id IS NOT NULL AND api_source_id IS NULL)
                    OR
                    (source_type = 'api' AND api_source_id IS NOT NULL AND mapping_id IS NULL)
                );
            """)
        except Exception as ck_err:
            if "already exists" not in str(ck_err):
                logger.warning(f"⚠️  Check constraint warning: {str(ck_err)}")
        
        conn.commit()
        logger.info("✅ tasks table extended successfully")
        
    except Exception as e:
        logger.error(f"❌ Error extending tasks table: {str(e)}")
        conn.rollback()
    finally:
        cur.close()


def initialize_api_sources_schema():
    """Initialize all API sources schema - safe to call multiple times"""
    logger.info("Initializing API sources schema...")
    create_api_sources_table()
    extend_tasks_table()
    logger.info("✅ API sources schema initialization complete")
