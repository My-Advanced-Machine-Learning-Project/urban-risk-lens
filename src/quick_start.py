"""
Quick Start Script - Fast ETL and Prediction Pipeline
Run this script to quickly process GeoJSON files
"""
import os
import sys
from pathlib import Path
from database_config import init_db
from data_pipeline import DataPipeline


def main():
    """
    Quick start main function
    """
    print("\n" + "="*80)
    print("URBAN RISK LENS - DATA PIPELINE QUICK START")
    print("="*80 + "\n")

    # Step 1: Initialize database
    print("Step 1: Initializing database and PostGIS...")
    try:
        init_db()
        print("✓ Database initialized\n")
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        print("Make sure PostgreSQL is running and .env is configured")
        return

    # Step 2: Choose operation mode
    print("Available options:")
    print("1. Process single GeoJSON file")
    print("2. Batch process all files in public/data")
    print("3. Process with predictions (requires model)")
    print()

    # Quick mode: process all files
    data_dir = "public/data"

    if not os.path.exists(data_dir):
        print(f"✗ Data directory not found: {data_dir}")
        print("Please ensure GeoJSON files are in public/data/")
        return

    # List available files
    geojson_files = list(Path(data_dir).rglob("*.geojson"))
    print(f"Found {len(geojson_files)} GeoJSON files:")
    for f in geojson_files[:10]:  # Show first 10
        print(f"  - {f.relative_to(data_dir)}")
    if len(geojson_files) > 10:
        print(f"  ... and {len(geojson_files) - 10} more")
    print()

    # Process
    print("Starting batch processing...")
    print("="*80 + "\n")

    with DataPipeline() as pipeline:
        # Process all files
        results = pipeline.batch_process_directory(
            input_dir=data_dir,
            output_dir=None,  # No output dir = only load to DB
            year=2024,
            pattern="**/*.geojson"
        )

        # Show summary
        print("\n" + "="*80)
        print("PROCESSING COMPLETE")
        print("="*80)

        successful = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]

        print(f"\nTotal files processed: {len(results)}")
        print(f"✓ Successful: {len(successful)}")
        print(f"✗ Failed: {len(failed)}")

        if successful:
            total_features = sum(
                step.get('loaded_count', 0)
                for r in successful
                for step in r.get('steps', [])
                if step.get('step') == 'etl'
            )
            print(f"\nTotal features loaded to database: {total_features}")

        # Show final statistics
        stats = pipeline.etl.get_etl_statistics()
        print(f"\nDatabase Statistics:")
        print(f"  Total records: {stats['total_records']}")
        print(f"  Districts: {stats['total_districts']}")
        print(f"  Source files: {stats['source_files']}")

        if failed:
            print(f"\n⚠ Failed files:")
            for r in failed[:5]:
                print(f"  - {r.get('input_file')}: {r.get('error', 'Unknown error')}")

    print("\n" + "="*80)
    print("Quick start completed!")
    print("="*80 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
