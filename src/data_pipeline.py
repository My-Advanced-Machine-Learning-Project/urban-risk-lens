"""
Data Pipeline Orchestrator
Combines ETL and Prediction services for automated workflows
"""
import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
from database_config import SessionLocal, init_db
from etl_service import ETLService
from prediction_service import PredictionService


class DataPipeline:
    """
    Orchestrates ETL and prediction workflows
    """

    def __init__(self, model_path: Optional[str] = None):
        self.db = SessionLocal()
        self.etl = ETLService(self.db)
        self.predictor = PredictionService(model_path, self.db) if model_path else None
        self.results = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db:
            self.db.close()

    def run_full_pipeline(self, input_file: str, output_file: str = None,
                         year: int = None, make_predictions: bool = True) -> Dict[str, Any]:
        """
        Run complete pipeline: Load -> Store -> Predict -> Export
        """
        start_time = datetime.now()
        pipeline_result = {
            'input_file': input_file,
            'start_time': start_time.isoformat(),
            'steps': []
        }

        print(f"\n{'='*80}")
        print(f"STARTING DATA PIPELINE: {input_file}")
        print(f"{'='*80}\n")

        # Step 1: ETL - Load data
        try:
            print("STEP 1: ETL - Loading data to database...")
            etl_result = self.etl.process_geojson_file(input_file, year)
            pipeline_result['steps'].append({
                'step': 'etl',
                'success': True,
                'loaded_count': etl_result['loaded_count'],
                'elapsed': etl_result['elapsed_seconds']
            })
            print(f"✓ ETL completed: {etl_result['loaded_count']} features loaded\n")
        except Exception as e:
            print(f"✗ ETL failed: {e}\n")
            pipeline_result['steps'].append({'step': 'etl', 'success': False, 'error': str(e)})
            return pipeline_result

        # Step 2: Predictions (if model available)
        if make_predictions and self.predictor and self.predictor.model:
            try:
                print("STEP 2: Making predictions...")

                if output_file:
                    # Load, predict, and save
                    with open(input_file, 'r', encoding='utf-8') as f:
                        geojson_data = json.load(f)

                    predicted_data = self.predictor.predict_from_geojson(geojson_data)

                    # Save predictions
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(predicted_data, f, ensure_ascii=False, indent=2)

                    pipeline_result['steps'].append({
                        'step': 'prediction',
                        'success': True,
                        'output_file': output_file,
                        'predictions_count': len(predicted_data['features'])
                    })
                    print(f"✓ Predictions saved to: {output_file}\n")
                else:
                    print("⊘ Skipping prediction save (no output file specified)\n")

            except Exception as e:
                print(f"✗ Prediction failed: {e}\n")
                pipeline_result['steps'].append({'step': 'prediction', 'success': False, 'error': str(e)})

        # Step 3: Statistics
        try:
            print("STEP 3: Collecting statistics...")
            stats = self.etl.get_etl_statistics()
            pipeline_result['statistics'] = stats
            print(f"✓ Database now contains {stats['total_records']} total records\n")
        except Exception as e:
            print(f"⊘ Statistics collection failed: {e}\n")

        # Complete
        elapsed = (datetime.now() - start_time).total_seconds()
        pipeline_result['end_time'] = datetime.now().isoformat()
        pipeline_result['total_elapsed_seconds'] = elapsed
        pipeline_result['success'] = all(step.get('success', False) for step in pipeline_result['steps'])

        print(f"{'='*80}")
        print(f"PIPELINE COMPLETED in {elapsed:.2f} seconds")
        print(f"Status: {'SUCCESS' if pipeline_result['success'] else 'PARTIAL/FAILED'}")
        print(f"{'='*80}\n")

        return pipeline_result

    def batch_process_directory(self, input_dir: str, output_dir: str = None,
                                year: int = None, pattern: str = "*.geojson") -> List[Dict[str, Any]]:
        """
        Process all files in directory through pipeline
        """
        input_path = Path(input_dir)
        files = list(input_path.glob(pattern))

        print(f"\nBatch processing {len(files)} files from {input_dir}")

        if output_dir:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

        results = []

        for i, file_path in enumerate(files, 1):
            print(f"\n[{i}/{len(files)}] Processing {file_path.name}")

            output_file = None
            if output_dir:
                output_file = str(Path(output_dir) / f"predicted_{file_path.name}")

            try:
                result = self.run_full_pipeline(
                    str(file_path),
                    output_file,
                    year,
                    make_predictions=bool(self.predictor)
                )
                results.append(result)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                results.append({
                    'input_file': str(file_path),
                    'success': False,
                    'error': str(e)
                })

        # Summary
        print(f"\n{'='*80}")
        print("BATCH PROCESSING SUMMARY")
        print(f"{'='*80}")
        print(f"Total files: {len(files)}")
        print(f"Successful: {sum(1 for r in results if r.get('success'))}")
        print(f"Failed: {sum(1 for r in results if not r.get('success'))}")
        print(f"{'='*80}\n")

        return results

    def incremental_update(self, new_data_file: str, year: int = None) -> Dict[str, Any]:
        """
        Incremental update: only process new/changed data
        """
        print(f"Incremental update from {new_data_file}")

        # Load new data
        with open(new_data_file, 'r', encoding='utf-8') as f:
            new_data = json.load(f)

        features = new_data.get('features', [])
        new_count = 0
        updated_count = 0

        for feature in features:
            properties = feature.get('properties', {})
            name = properties.get('Name') or properties.get('clean_name')

            if name:
                # Check if exists
                existing = self.etl.repo.get_by_name(name)

                if not existing:
                    # New feature
                    self.etl.repo.create_from_geojson_feature(feature, new_data_file, year)
                    new_count += 1
                else:
                    # Could update existing here
                    updated_count += 1

        return {
            'new_features': new_count,
            'updated_features': updated_count,
            'total_processed': len(features)
        }

    def export_predictions_to_csv(self, output_file: str, district: str = None) -> str:
        """
        Export predictions from database to CSV
        """
        print(f"Exporting predictions to CSV: {output_file}")

        filter_params = {'district': district} if district else None
        predictions = self.predictor.predict_from_database(filter_params, limit=10000)

        import pandas as pd
        df = pd.DataFrame(predictions)
        df.to_csv(output_file, index=False)

        print(f"Exported {len(df)} records to {output_file}")
        return output_file

    def generate_report(self, output_file: str = "pipeline_report.json"):
        """
        Generate comprehensive pipeline report
        """
        report = {
            'generated_at': datetime.now().isoformat(),
            'database_statistics': self.etl.get_etl_statistics(),
            'pipeline_runs': self.results
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"Report saved to {output_file}")
        return report


def quick_pipeline(input_file: str, output_file: str = None, model_path: str = None, year: int = None):
    """
    Quick helper to run pipeline on single file
    """
    with DataPipeline(model_path=model_path) as pipeline:
        return pipeline.run_full_pipeline(input_file, output_file, year)


def quick_batch_pipeline(input_dir: str, output_dir: str = None, model_path: str = None):
    """
    Quick helper to run pipeline on directory
    """
    with DataPipeline(model_path=model_path) as pipeline:
        return pipeline.batch_process_directory(input_dir, output_dir)


if __name__ == "__main__":
    print("Data Pipeline - Quick Start")
    print("=" * 80)

    # Initialize database
    print("Initializing database...")
    init_db()

    # Example 1: Single file pipeline (without predictions)
    print("\nExample 1: ETL Only (no predictions)")
    if os.path.exists("public/data/istanbul_mahalle_risk.geojson"):
        with DataPipeline() as pipeline:
            result = pipeline.run_full_pipeline(
                "public/data/istanbul_mahalle_risk.geojson",
                year=2024,
                make_predictions=False
            )
            print(f"\nResult: {result.get('success')}")

    # Example 2: Batch processing directory
    print("\nExample 2: Batch Processing")
    if os.path.exists("public/data"):
        with DataPipeline() as pipeline:
            results = pipeline.batch_process_directory(
                "public/data",
                year=2024
            )
            print(f"\nProcessed {len(results)} files")

    print("\n" + "=" * 80)
    print("Examples completed!")
