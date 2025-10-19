"""
Prediction Service for Urban Risk Analysis
Fast prediction service for new data and updated GeoJSON files
"""
import pandas as pd
import numpy as np
import json
import pickle
import joblib
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from pathlib import Path
from database_config import SessionLocal
from geo_repository import GeoSpatialRepository
from geo_models import MahalleRiskData


class PredictionService:
    """
    Service for making risk predictions on new and updated data
    """

    def __init__(self, model_path: Optional[str] = None, db_session=None):
        self.db = db_session or SessionLocal()
        self.repo = GeoSpatialRepository(self.db)
        self.model = None
        self.feature_columns = None

        if model_path:
            self.load_model(model_path)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db:
            self.db.close()

    def load_model(self, model_path: str):
        """
        Load trained model from file
        """
        print(f"Loading model from {model_path}")

        if model_path.endswith('.pkl'):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
        elif model_path.endswith('.joblib'):
            self.model = joblib.load(model_path)
        else:
            raise ValueError(f"Unsupported model format: {model_path}")

        print(f"Model loaded: {type(self.model).__name__}")

    def set_feature_columns(self, columns: List[str]):
        """
        Set feature columns for prediction
        """
        self.feature_columns = columns

    def prepare_features(self, data: Union[pd.DataFrame, Dict[str, Any]]) -> pd.DataFrame:
        """
        Prepare features for prediction
        """
        if isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            df = data.copy()

        # Default feature columns if not set
        if self.feature_columns is None:
            self.feature_columns = [
                # Earthquake features
                'rjb_km', 'earthquake_min_distance_km', 'earthquake_mean_distance_km',
                'earthquake_count_5km', 'earthquake_count_10km', 'earthquake_count_20km',
                'earthquake_count_50km', 'max_magnitude_nearby_20km',
                'mean_magnitude_nearby_20km', 'strong_earthquakes_20km',
                'moderate_earthquakes_20km', 'seismic_intensity_factor',

                # PGA features
                'pga_scenario_mw72', 'pga_scenario_mw75',

                # Soil features
                'vs30', 'vs30_mean',

                # Population and building features
                'toplam_nufus', 'toplam_bina', 'population_density', 'building_density',

                # Distance features
                'distance_to_city_center_km', 'distance_to_bosphorus_km',
                'distance_to_marmara_km'
            ]

        # Select and prepare features
        available_cols = [col for col in self.feature_columns if col in df.columns]

        if not available_cols:
            raise ValueError("No feature columns found in data")

        X = df[available_cols].copy()

        # Handle missing values
        X = X.fillna(X.mean())

        return X

    def predict_single(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make prediction for single data point
        """
        if self.model is None:
            raise ValueError("Model not loaded. Use load_model() first.")

        # Prepare features
        X = self.prepare_features(data)

        # Make prediction
        prediction = self.model.predict(X)[0]

        # Get prediction probabilities if available
        proba = None
        if hasattr(self.model, 'predict_proba'):
            proba = self.model.predict_proba(X)[0]

        result = {
            'prediction': float(prediction),
            'timestamp': datetime.now().isoformat()
        }

        if proba is not None:
            result['probabilities'] = proba.tolist()
            result['confidence'] = float(max(proba))

        return result

    def predict_batch(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Make predictions for batch of data
        """
        if self.model is None:
            raise ValueError("Model not loaded. Use load_model() first.")

        # Prepare features
        X = self.prepare_features(data)

        # Make predictions
        predictions = self.model.predict(X)

        # Add predictions to dataframe
        result_df = data.copy()
        result_df['predicted_risk'] = predictions

        # Add probabilities if available
        if hasattr(self.model, 'predict_proba'):
            probas = self.model.predict_proba(X)
            result_df['prediction_confidence'] = probas.max(axis=1)

        result_df['prediction_timestamp'] = datetime.now()

        return result_df

    def predict_from_geojson(self, geojson_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make predictions for GeoJSON data
        """
        features = geojson_data.get('features', [])
        print(f"Making predictions for {len(features)} features...")

        predicted_features = []

        for feature in features:
            properties = feature.get('properties', {})

            try:
                # Make prediction
                pred_result = self.predict_single(properties)

                # Add prediction to properties
                properties['predicted_risk_score'] = pred_result['prediction']
                if 'confidence' in pred_result:
                    properties['prediction_confidence'] = pred_result['confidence']
                properties['prediction_timestamp'] = pred_result['timestamp']

                # Create new feature with predictions
                predicted_feature = {
                    'type': 'Feature',
                    'properties': properties,
                    'geometry': feature.get('geometry')
                }
                predicted_features.append(predicted_feature)

            except Exception as e:
                print(f"Error predicting for feature: {e}")
                predicted_features.append(feature)  # Keep original

        return {
            'type': 'FeatureCollection',
            'features': predicted_features,
            'metadata': {
                'prediction_date': datetime.now().isoformat(),
                'total_features': len(features),
                'successful_predictions': len(predicted_features)
            }
        }

    def predict_from_database(self, filter_params: Dict[str, Any] = None,
                             limit: int = 100) -> List[Dict[str, Any]]:
        """
        Make predictions for data from database
        """
        print("Fetching data from database...")

        # Get data from database
        if filter_params and filter_params.get('district'):
            data = self.repo.get_by_district(filter_params['district'])
        elif filter_params and filter_params.get('high_risk'):
            data = self.repo.get_high_risk_areas()
        else:
            # Get all data with limit
            query = self.db.query(MahalleRiskData).limit(limit)
            data = query.all()

        print(f"Found {len(data)} records")

        # Convert to DataFrame
        records = []
        for item in data:
            record = {
                'id': item.id,
                'name': item.name,
                'rjb_km': item.rjb_km,
                'earthquake_min_distance_km': item.earthquake_min_distance_km,
                'earthquake_count_5km': item.earthquake_count_5km,
                'earthquake_count_10km': item.earthquake_count_10km,
                'pga_scenario_mw72': item.pga_scenario_mw72,
                'vs30': item.vs30,
                'toplam_nufus': item.toplam_nufus,
                'toplam_bina': item.toplam_bina,
                'population_density': item.population_density,
                'building_density': item.building_density,
                'distance_to_city_center_km': item.distance_to_city_center_km
            }
            records.append(record)

        df = pd.DataFrame(records)

        # Make predictions
        result_df = self.predict_batch(df)

        return result_df.to_dict('records')

    def predict_and_save_geojson(self, input_file: str, output_file: str):
        """
        Load GeoJSON, make predictions, and save to new file
        """
        print(f"Loading {input_file}")

        # Load GeoJSON
        with open(input_file, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        # Make predictions
        predicted_data = self.predict_from_geojson(geojson_data)

        # Save to file
        print(f"Saving predictions to {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(predicted_data, f, ensure_ascii=False, indent=2)

        print(f"Saved {len(predicted_data['features'])} features with predictions")

        return output_file

    def calculate_risk_statistics(self, predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics from predictions
        """
        df = pd.DataFrame(predictions)

        if 'predicted_risk' not in df.columns:
            return {}

        stats = {
            'total_predictions': len(df),
            'mean_risk': float(df['predicted_risk'].mean()),
            'median_risk': float(df['predicted_risk'].median()),
            'min_risk': float(df['predicted_risk'].min()),
            'max_risk': float(df['predicted_risk'].max()),
            'std_risk': float(df['predicted_risk'].std()),
        }

        # Risk categories
        if 'predicted_risk' in df.columns:
            stats['high_risk_count'] = int((df['predicted_risk'] > 0.7).sum())
            stats['medium_risk_count'] = int(((df['predicted_risk'] > 0.4) & (df['predicted_risk'] <= 0.7)).sum())
            stats['low_risk_count'] = int((df['predicted_risk'] <= 0.4).sum())

        return stats

    def batch_predict_directory(self, input_dir: str, output_dir: str,
                                pattern: str = "*.geojson"):
        """
        Batch predict all GeoJSON files in directory
        """
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        files = list(input_path.glob(pattern))
        print(f"Found {len(files)} files to process")

        results = []

        for file_path in files:
            try:
                output_file = output_path / f"predicted_{file_path.name}"
                self.predict_and_save_geojson(str(file_path), str(output_file))

                results.append({
                    'input_file': str(file_path),
                    'output_file': str(output_file),
                    'success': True
                })
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                results.append({
                    'input_file': str(file_path),
                    'success': False,
                    'error': str(e)
                })

        return results


def quick_predict(data: Dict[str, Any], model_path: str) -> Dict[str, Any]:
    """
    Quick helper function for single prediction
    """
    with PredictionService(model_path=model_path) as predictor:
        return predictor.predict_single(data)


def quick_predict_geojson(input_file: str, output_file: str, model_path: str):
    """
    Quick helper for GeoJSON prediction
    """
    with PredictionService(model_path=model_path) as predictor:
        return predictor.predict_and_save_geojson(input_file, output_file)


if __name__ == "__main__":
    print("Prediction Service - Test")
    print("=" * 60)

    # Example usage
    # Note: Replace with actual model path
    # predictor = PredictionService(model_path="path/to/model.pkl")

    # Example data
    sample_data = {
        'rjb_km': 18.5,
        'earthquake_min_distance_km': 2.78,
        'earthquake_count_5km': 3.0,
        'earthquake_count_10km': 13.0,
        'pga_scenario_mw72': 0.0045,
        'vs30': 400.0,
        'toplam_nufus': 14534.0,
        'toplam_bina': 2180.0,
        'population_density': 6.66,
        'building_density': 0.15,
        'distance_to_city_center_km': 21.84
    }

    print("Sample prediction data ready")
    print(f"Features: {len(sample_data)}")
