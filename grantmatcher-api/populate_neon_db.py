#!/usr/bin/env python
"""
Populate Neon Database with Real Grant Data from Grants.gov
This script fetches real grants from Grants.gov API and generates embeddings.
"""

import os
import sys
import gc

# Memory optimizations
print("Configuring memory optimizations...")

# ============================================================================
# OPTION 1: Set your Neon connection string directly here (easier for Windows)
# ============================================================================
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_cjh9nGlNYxf1@ep-mute-wildflower-aihk8cmq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ============================================================================
# OPTION 2: Or leave it empty to use the DATABASE_URL environment variable
# ============================================================================
# NEON_DATABASE_URL = ""

# Set environment variable BEFORE importing database module
db_url = NEON_DATABASE_URL or os.getenv("DATABASE_URL")
if db_url:
    os.environ["DATABASE_URL"] = db_url
else:
    print("\n❌ ERROR: DATABASE_URL not configured!")
    print("\nOption 1: Set it directly in this script (line 8)")
    print("  NEON_DATABASE_URL = 'postgresql://user:pass@host/db'")
    print("\nOption 2: Set environment variable")
    print("  $env:DATABASE_URL='postgresql://user:pass@host/db'")
    sys.exit(1)

from database import get_db, engine
from ingestion.grants_gov import GrantsGovIngester
from ingestion.embeddings import GrantEmbedder

def main():
    print("=" * 70)
    print("Populating Neon Database with Real Grant Data from Grants.gov")
    print("=" * 70)
    
    # Verify connection
    print(f"✓ Target Database: {engine.url.render_as_string(hide_password=True)}")
    if engine.url.drivername == "sqlite":
         print("\n⚠️  WARNING: You're still using SQLite, not Neon PostgreSQL")
         response = input("Continue anyway? (y/n): ")
         if response.lower() != 'y':
             sys.exit(0)
    else:
        print(f"✓ Successfully targeting production database")

    
    if db_url.startswith("sqlite"):
        print("\n⚠️  WARNING: You're using SQLite, not Neon PostgreSQL")
        print(f"Current DATABASE_URL: {db_url}")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    else:
        # Extract host from connection string for display
        try:
            host_part = db_url.split('@')[1].split('/')[0] if '@' in db_url else 'database'
            print(f"\n✓ Connected to Neon: {host_part}")
        except:
            print(f"\n✓ Connected to database")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Step 1: Fetch real grants from Grants.gov
        print("\n" + "=" * 70)
        print("Step 1: Fetching Real Grants from Grants.gov API")
        print("=" * 70)
        print("This will fetch up to 500 active grant opportunities...")
        print("(This may take 5-10 minutes depending on API response time)")
        print()
        
        ingester = GrantsGovIngester()
        stats = ingester.ingest_grants(db)
        
        print(f"\n✓ Grants.gov ingestion completed successfully!")
        print(f"  - Fetched: {stats['fetched']} grants")
        print(f"  - New: {stats['new']} grants")
        print(f"  - Updated: {stats['updated']} grants")
        print(f"  - Errors: {stats['errors']} errors")
        
        if stats['new'] == 0 and stats['updated'] == 0:
            print("\n⚠️  No grants were added. The database may already be populated.")
            print("   Or there may be an issue with the Grants.gov API.")
        
        # Step 2: Generate embeddings for semantic search
        print("\n" + "=" * 70)
        print("Step 2: Generating AI Embeddings for Semantic Search")
        print("=" * 70)
        print("This will generate embeddings for all grants...")
        print("(This may take several minutes)")
        print()
        
        embedder = GrantEmbedder()
        embedding_stats = embedder.embed_all_grants(db, batch_size=10)
        
        print(f"\n✓ Embeddings generated successfully!")
        print(f"  - Processed: {embedding_stats['processed']} grants")
        print(f"  - Embedded: {embedding_stats['embedded']} grants")
        print(f"  - Skipped: {embedding_stats['skipped']} grants")
        print(f"  - Errors: {embedding_stats['errors']} errors")
        
        # Summary
        print("\n" + "=" * 70)
        print("✅ Database Population Complete!")
        print("=" * 70)
        print("\nYour Neon database now has:")
        print(f"  • {stats['new']} new real grants from Grants.gov")
        print(f"  • {embedding_stats['embedded']} grants with AI embeddings")
        print(f"  • Ready for semantic matching and search")
        print("\n🎉 You can now browse grants in your application!")
        print("   Visit your app and go to 'Browse Grants' to see them.")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. Partial data may have been saved.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Troubleshooting tips:")
        print("  1. Check your DATABASE_URL is correct")
        print("  2. Ensure your Neon database is accessible")
        print("  3. Verify Grants.gov API is accessible")
        print("  4. Check your internet connection")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
