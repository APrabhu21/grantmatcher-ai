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
from ingestion.sam_gov import SAMGovIngester
from ingestion.embeddings import GrantEmbedder
import argparse

def main():
    parser = argparse.ArgumentParser(description="Populate Neon Database with Real Grant Data")
    parser.add_argument("--source", type=str, choices=["grants.gov", "sam.gov", "all"], default="all", 
                        help="Source to ingest from (default: all)")
    parser.add_argument("--limit", type=int, default=500, help="Max records per source (default: 500)")
    args = parser.parse_args()

    print("=" * 70)
    print(f"Populating Neon Database from {args.source.upper()}")
    print("=" * 70)
    
    # Verify connection
    try:
        print(f"OK: Target Database: {engine.url.render_as_string(hide_password=True)}")
    except:
        print(f"OK: Connected to database")
        
    # Get database session
    db = next(get_db())
    
    try:
        sources_stats = {}
        
        # Step 1: Fetch real grants
        sources_to_run = []
        if args.source == "all":
            sources_to_run = ["grants.gov", "sam.gov"]
        else:
            sources_to_run = [args.source]

        for src in sources_to_run:
            print("\n" + "=" * 70)
            print(f"Fetching Real Grants from {src.upper()}")
            print("=" * 70)
            
            if src == "grants.gov":
                ingester = GrantsGovIngester()
                stats = ingester.ingest_grants(db, limit=args.limit)
                sources_stats[src] = stats
            elif src == "sam.gov":
                ingester = SAMGovIngester()
                stats = ingester.ingest_sam_opportunities(db, max_records=args.limit)
                sources_stats[src] = stats
            
            print(f"\n✓ {src} ingestion completed successfully!")
            print(f"  - Fetched: {stats['fetched']} grants")
            print(f"  - New: {stats.get('new', 0)} grants")
            print(f"  - Updated/Merged: {stats.get('updated', 0) + stats.get('merged', 0)} grants")
            print(f"  - Errors: {stats['errors']} errors")
        
        # Step 2: Generate embeddings for semantic search
        print("\n" + "=" * 70)
        print("Step 2: Generating AI Embeddings for Semantic Search")
        print("=" * 70)
        
        embedder = GrantEmbedder()
        embedding_stats = embedder.embed_all_grants(db, batch_size=10)
        
        print(f"\n✓ Embeddings generated successfully!")
        print(f"  - Processed: {embedding_stats['processed']} grants")
        print(f"  - Embedded: {embedding_stats['embedded']} grants")
        
        # Summary
        print("\n" + "=" * 70)
        print("✅ Database Population Complete!")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
