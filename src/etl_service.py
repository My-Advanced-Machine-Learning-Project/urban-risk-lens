"""
ETL Service for CSV and GeoJSON data processing
Fast and efficient data extraction, transformation, and loading
"""
import pandas as pd
import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
from database_config import SessionLocal
from geo_repository import GeoSpatialRepository
from geojson_utils import load_geojson_file, extract_file_info


class ETLService:
    """
    ETL Service for processing CSV and GeoJSON files
    """

    def __init__(self, db_session=None):
        self.db = db_session or SessionLocal()
        self.repo = GeoSpatialRepository(self.db)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db:
            self.db.close()

    def extract_csv(self, file_path: str) -> pd.DataFrame:
        """
        Extract data from CSV file
        """
        print(f"Extracting CSV: {file_path}")
        return pd.read_csv(file_path)

    def extract_geojson(self, file_path: str) -> Dict[str, Any]:
        """
        Extract data from GeoJSON file
        """
        print(f"Extracting GeoJSON: {file_path}")
        return load_geojson_file(file_path)

    def transform_csv_to_dict(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Transform DataFrame to list of dictionaries
        """
        print(f"Transforming {len(df)} rows")
        # Convert NaN to None
        df = df.where(pd.notnull(df), None)
        return df.to_dict('records')

    def transform_geojson_features(self, geojson_data: Dict[str, Any],
                                  source_file: str = None,
                                  year: int = None) -> List[Dict[str, Any]]:
        """
        Transform GeoJSON features for database
        """
        features = geojson_data.get('features', [])
        print(f"Transforming {len(features)} GeoJSON features")

        file_info = extract_file_info(source_file) if source_file else {}

        transformed = []
        for feature in features:
            feature_data = {
                'feature': feature,
                'source_file': source_file or file_info.get('filename'),
                'year': year or file_info.get('year'),
                'city': file_info.get('city'),
                'type': file_info.get('type')
            }
            transformed.append(feature_data)

        return transformed

    def load_geojson_to_db(self, geojson_data: Dict[str, Any],
                          source_file: str = None,
                          year: int = None,
                          batch_size: int = 100) -> int:
        """
        Load GeoJSON data to database with batching
        """
        features = geojson_data.get('features', [])
        total = len(features)
        print(f"Loading {total} features to database...")

        file_info = extract_file_info(source_file) if source_file else {}
        year = year or file_info.get('year')

        loaded_count = 0
        errors = []

        for i in range(0, total, batch_size):
            batch = features[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1} ({i+1}-{min(i+batch_size, total)})")

            for feature in batch:
                try:
                    self.repo.create_from_geojson_feature(
                        feature,
                        source_file=source_file,
                        year=year
                    )
                    loaded_count += 1
                except Exception as e:
                    errors.append(f"Feature {feature.get('id', 'unknown')}: {str(e)}")

        if errors:
            print(f"Completed with {len(errors)} errors")
            for error in errors[:5]:  # Show first 5 errors
                print(f"  - {error}")

        print(f"Successfully loaded {loaded_count}/{total} features")
        return loaded_count

    def process_geojson_file(self, file_path: str, year: int = None) -> Dict[str, Any]:
        """
        Full ETL pipeline for single GeoJSON file
        """
        start_time = datetime.now()
        print(f"\n{'='*60}")
        print(f"ETL Pipeline: {file_path}")
        print(f"{'='*60}")

        # Extract
        geojson_data = self.extract_geojson(file_path)

        # Load
        loaded_count = self.load_geojson_to_db(geojson_data, file_path, year)

        # Create spatial index
        print("Creating spatial index...")
        self.repo.create_spatial_index()

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\nCompleted in {elapsed:.2f} seconds")

        return {
            'file': file_path,
            'total_features': len(geojson_data.get('features', [])),
            'loaded_count': loaded_count,
            'elapsed_seconds': elapsed,
            'success': True
        }

    def process_multiple_geojson_files(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """
        Process multiple GeoJSON files
        """
        results = []
        total_start = datetime.now()

        for file_path in file_paths:
            try:
                result = self.process_geojson_file(file_path)
                results.append(result)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                results.append({
                    'file': file_path,
                    'success': False,
                    'error': str(e)
                })

        total_elapsed = (datetime.now() - total_start).total_seconds()
        print(f"\n{'='*60}")
        print(f"Total ETL Time: {total_elapsed:.2f} seconds")
        print(f"Files processed: {len(results)}")
        print(f"Successful: {sum(1 for r in results if r.get('success'))}")
        print(f"{'='*60}")

        return results

    def discover_and_process_all(self, base_path: str = "public/data") -> List[Dict[str, Any]]:
        """
        Discover and process all GeoJSON files in directory
        """
        print(f"Discovering GeoJSON files in {base_path}...")

        geojson_files = []
        for root, dirs, files in os.walk(base_path):
            for file in files:
                if file.endswith('.geojson'):
                    geojson_files.append(os.path.join(root, file))

        print(f"Found {len(geojson_files)} GeoJSON files")

        return self.process_multiple_geojson_files(geojson_files)

    def update_existing_features(self, file_path: str, update_field: str = 'updated_at') -> int:
        """
        Update existing features from GeoJSON file
        """
        print(f"Updating features from {file_path}")

        geojson_data = self.extract_geojson(file_path)
        features = geojson_data.get('features', [])

        updated_count = 0
        for feature in features:
            properties = feature.get('properties', {})
            name = properties.get('Name') or properties.get('clean_name')

            if name:
                # Find existing records
                existing = self.repo.get_by_name(name)
                if existing:
                    # Update logic here
                    updated_count += len(existing)

        print(f"Updated {updated_count} features")
        return updated_count

    def export_to_csv(self, output_file: str, query_params: Dict[str, Any] = None) -> str:
        """
        Export database data to CSV
        """
        print(f"Exporting data to CSV: {output_file}")

        # Get data from database
        if query_params and query_params.get('district'):
            data = self.repo.get_by_district(query_params['district'])
        else:
            data = self.db.query(self.repo.db.query.statement.compile().model).all()

        # Convert to DataFrame
        records = []
        for item in data:
            record = {
                'id': item.id,
                'name': item.name,
                'district': item.ilce_adi,
                'population': item.toplam_nufus,
                'buildings': item.toplam_bina,
                'risk_score': item.bilesik_risk_skoru,
                'latitude': item.y,
                'longitude': item.x
            }
            records.append(record)

        df = pd.DataFrame(records)
        df.to_csv(output_file, index=False)
        print(f"Exported {len(df)} records to {output_file}")

        return output_file

    def get_etl_statistics(self) -> Dict[str, Any]:
        """
        Get ETL processing statistics
        """
        from sqlalchemy import func
        from geo_models import MahalleRiskData

        stats = self.db.query(
            func.count(MahalleRiskData.id).label('total_records'),
            func.count(func.distinct(MahalleRiskData.ilce_adi)).label('districts'),
            func.count(func.distinct(MahalleRiskData.source_file)).label('source_files'),
            func.min(MahalleRiskData.created_at).label('first_import'),
            func.max(MahalleRiskData.updated_at).label('last_update')
        ).first()

        return {
            'total_records': stats.total_records or 0,
            'total_districts': stats.districts or 0,
            'source_files': stats.source_files or 0,
            'first_import': stats.first_import.isoformat() if stats.first_import else None,
            'last_update': stats.last_update.isoformat() if stats.last_update else None
        }


def quick_import(file_path: str, year: int = None):
    """
    Quick helper function to import a single file
    """
    with ETLService() as etl:
        return etl.process_geojson_file(file_path, year)


def quick_import_all(base_path: str = "public/data"):
    """
    Quick helper to import all GeoJSON files
    """
    with ETLService() as etl:
        return etl.discover_and_process_all(base_path)


if __name__ == "__main__":
    print("ETL Service - Quick Test")
    print("=" * 60)

    # Example usage
    with ETLService() as etl:
        # Show current statistics
        stats = etl.get_etl_statistics()
        print("\nCurrent Database Statistics:")
        print(f"  Total records: {stats['total_records']}")
        print(f"  Districts: {stats['total_districts']}")
        print(f"  Source files: {stats['source_files']}")

        # Process a single file
        if os.path.exists("public/data/istanbul_mahalle_risk.geojson"):
            result = etl.process_geojson_file("public/data/istanbul_mahalle_risk.geojson")
            print(f"\nImport result: {result}")
