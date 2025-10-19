"""
Example script for importing GeoJSON files into PostGIS database
"""
import os
from database_config import SessionLocal, init_db
from geo_repository import GeoSpatialRepository
from geojson_utils import (
    load_geojson_file,
    list_available_geojson_files,
    extract_file_info,
    get_property_statistics
)


def import_single_geojson(file_path: str):
    """
    Import a single GeoJSON file into database
    """
    print(f"\n=== Importing {file_path} ===")

    # Extract file info
    info = extract_file_info(file_path)
    print(f"City: {info['city']}, Year: {info['year']}, Type: {info['type']}")

    # Load GeoJSON
    geojson_data = load_geojson_file(file_path)
    print(f"Features found: {len(geojson_data.get('features', []))}")

    # Create database session
    db = SessionLocal()
    try:
        repo = GeoSpatialRepository(db)

        # Import data
        results = repo.bulk_import_geojson(
            geojson_data,
            source_file=file_path,
            year=info['year']
        )

        print(f"Successfully imported {len(results)} features")

        # Create spatial index
        print("Creating spatial index...")
        repo.create_spatial_index()
        print("Spatial index created")

    finally:
        db.close()


def import_all_geojson_files(base_path: str = "public/data"):
    """
    Import all GeoJSON files from directory
    """
    print(f"\n=== Scanning for GeoJSON files in {base_path} ===")

    files_info = list_available_geojson_files(base_path)

    print(f"Found {len(files_info)} GeoJSON files")

    for file_info in files_info:
        if file_info.get('valid'):
            try:
                import_single_geojson(file_info['path'])
            except Exception as e:
                print(f"Error importing {file_info['path']}: {e}")


def example_spatial_queries():
    """
    Example spatial queries using PostGIS
    """
    db = SessionLocal()
    try:
        repo = GeoSpatialRepository(db)

        print("\n=== Example 1: Find neighborhood by name ===")
        results = repo.get_by_name("Gülsuyu")
        for item in results:
            print(f"  {item.mahalle_adi} - Risk: {item.bilesik_risk_skoru}")

        print("\n=== Example 2: Get high risk areas ===")
        high_risk = repo.get_high_risk_areas(threshold=0.2)
        print(f"Found {len(high_risk)} high risk areas")
        for item in high_risk[:5]:  # Show top 5
            print(f"  {item.name} - Risk: {item.bilesik_risk_skoru:.4f}")

        print("\n=== Example 3: Find areas within 5km of a point ===")
        # Istanbul center coordinates
        lon, lat = 28.9784, 41.0082
        nearby = repo.find_within_distance(lon, lat, distance_km=5)
        print(f"Found {len(nearby)} areas within 5km of Istanbul center")

        print("\n=== Example 4: Find nearest neighborhoods ===")
        nearest = repo.find_nearest(lon, lat, limit=5)
        for area, distance in nearest:
            print(f"  {area.name} - {distance:.2f} km away")

        print("\n=== Example 5: District statistics ===")
        stats = repo.get_statistics_by_district("Maltepe")
        print(f"Maltepe statistics:")
        print(f"  Neighborhoods: {stats['neighborhood_count']}")
        print(f"  Average risk: {stats['average_risk']:.4f}")
        print(f"  Total population: {stats['total_population']:,}")
        print(f"  Total buildings: {stats['total_buildings']:,}")

        print("\n=== Example 6: Export as GeoJSON ===")
        if high_risk:
            geojson = repo.get_as_geojson(high_risk[0].id)
            print(f"Exported {geojson['properties'].get('Name')} as GeoJSON")

    finally:
        db.close()


def analyze_geojson_file(file_path: str):
    """
    Analyze a GeoJSON file before importing
    """
    print(f"\n=== Analyzing {file_path} ===")

    data = load_geojson_file(file_path)
    features = data.get('features', [])

    print(f"Total features: {len(features)}")

    if features:
        # Get first feature to show structure
        sample = features[0]
        print(f"\nSample feature properties:")
        props = sample.get('properties', {})
        for key in list(props.keys())[:10]:  # Show first 10 properties
            print(f"  {key}: {props[key]}")

        # Get statistics for risk score
        stats = get_property_statistics(data, 'bilesik_risk_skoru')
        if stats:
            print(f"\nRisk score statistics:")
            print(f"  Count: {stats['count']}")
            print(f"  Min: {stats['min']:.4f}")
            print(f"  Max: {stats['max']:.4f}")
            print(f"  Mean: {stats['mean']:.4f}")

        # Population statistics
        pop_stats = get_property_statistics(data, 'toplam_nufus')
        if pop_stats:
            print(f"\nPopulation statistics:")
            print(f"  Total: {pop_stats['sum']:,.0f}")
            print(f"  Average: {pop_stats['mean']:,.0f}")


def main():
    """
    Main execution
    """
    print("=" * 60)
    print("PostGIS GeoJSON Import and Query Examples")
    print("=" * 60)

    # Initialize database
    print("\n1. Initializing database and PostGIS...")
    init_db()
    print("Database initialized")

    # Analyze a file first
    print("\n2. Analyzing GeoJSON file...")
    sample_file = "public/data/istanbul_mahalle_risk.geojson"
    if os.path.exists(sample_file):
        analyze_geojson_file(sample_file)

    # Import single file
    print("\n3. Importing single GeoJSON file...")
    if os.path.exists(sample_file):
        import_single_geojson(sample_file)

    # Run spatial queries
    print("\n4. Running spatial queries...")
    example_spatial_queries()

    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
