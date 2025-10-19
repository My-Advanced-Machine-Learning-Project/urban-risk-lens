"""
GeoJSON utility functions for loading and processing spatial data
"""
import json
import os
from typing import Dict, Any, List
from pathlib import Path


def load_geojson_file(file_path: str) -> Dict[str, Any]:
    """
    Load a GeoJSON file and return as dictionary
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_geojson_file(data: Dict[str, Any], file_path: str):
    """
    Save GeoJSON data to file
    """
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_file_info(file_path: str) -> Dict[str, Any]:
    """
    Extract city and year information from file path
    e.g., 'public/data/2025/istanbul_risk_predictions.geojson'
    returns: {'city': 'istanbul', 'year': 2025, 'type': 'predictions'}
    """
    path = Path(file_path)
    filename = path.stem  # filename without extension

    # Try to extract year from path
    year = None
    for part in path.parts:
        if part.isdigit() and len(part) == 4:
            year = int(part)
            break

    # Extract city name from filename
    city = None
    for city_name in ['istanbul', 'ankara', 'izmir']:
        if city_name in filename.lower():
            city = city_name
            break

    # Determine data type
    data_type = 'current'
    if 'prediction' in filename.lower():
        data_type = 'prediction'
    elif 'final' in filename.lower():
        data_type = 'final'

    return {
        'city': city,
        'year': year,
        'type': data_type,
        'filename': path.name
    }


def validate_geojson(data: Dict[str, Any]) -> bool:
    """
    Basic validation of GeoJSON structure
    """
    if not isinstance(data, dict):
        return False

    geojson_type = data.get('type')

    if geojson_type == 'FeatureCollection':
        return 'features' in data and isinstance(data['features'], list)
    elif geojson_type == 'Feature':
        return 'geometry' in data and 'properties' in data
    elif geojson_type in ['Point', 'LineString', 'Polygon', 'MultiPoint',
                         'MultiLineString', 'MultiPolygon', 'GeometryCollection']:
        return 'coordinates' in data

    return False


def count_features(geojson_data: Dict[str, Any]) -> int:
    """
    Count features in GeoJSON
    """
    if geojson_data.get('type') == 'FeatureCollection':
        return len(geojson_data.get('features', []))
    elif geojson_data.get('type') == 'Feature':
        return 1
    return 0


def get_bbox(geojson_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculate bounding box of GeoJSON data
    Returns dict with min/max lon/lat
    """
    if geojson_data.get('type') == 'FeatureCollection':
        features = geojson_data.get('features', [])
    elif geojson_data.get('type') == 'Feature':
        features = [geojson_data]
    else:
        return None

    min_lon, min_lat = float('inf'), float('inf')
    max_lon, max_lat = float('-inf'), float('-inf')

    for feature in features:
        coords = _extract_coordinates(feature.get('geometry', {}))
        for lon, lat in coords:
            min_lon = min(min_lon, lon)
            max_lon = max(max_lon, lon)
            min_lat = min(min_lat, lat)
            max_lat = max(max_lat, lat)

    return {
        'min_lon': min_lon,
        'max_lon': max_lon,
        'min_lat': min_lat,
        'max_lat': max_lat,
        'center_lon': (min_lon + max_lon) / 2,
        'center_lat': (min_lat + max_lat) / 2
    }


def _extract_coordinates(geometry: Dict[str, Any]) -> List[List[float]]:
    """
    Recursively extract all coordinates from geometry
    """
    coords = []
    geom_type = geometry.get('type')
    coordinates = geometry.get('coordinates', [])

    if geom_type == 'Point':
        coords.append(coordinates)
    elif geom_type in ['LineString', 'MultiPoint']:
        coords.extend(coordinates)
    elif geom_type in ['Polygon', 'MultiLineString']:
        for ring in coordinates:
            coords.extend(ring)
    elif geom_type == 'MultiPolygon':
        for polygon in coordinates:
            for ring in polygon:
                coords.extend(ring)

    return coords


def filter_features_by_property(geojson_data: Dict[str, Any],
                                property_name: str,
                                property_value: Any) -> Dict[str, Any]:
    """
    Filter features by property value
    """
    if geojson_data.get('type') != 'FeatureCollection':
        return geojson_data

    filtered_features = [
        f for f in geojson_data.get('features', [])
        if f.get('properties', {}).get(property_name) == property_value
    ]

    return {
        'type': 'FeatureCollection',
        'features': filtered_features
    }


def get_property_statistics(geojson_data: Dict[str, Any],
                           property_name: str) -> Dict[str, Any]:
    """
    Calculate statistics for a numeric property
    """
    if geojson_data.get('type') != 'FeatureCollection':
        return None

    values = []
    for feature in geojson_data.get('features', []):
        value = feature.get('properties', {}).get(property_name)
        if value is not None and isinstance(value, (int, float)):
            values.append(value)

    if not values:
        return None

    return {
        'property': property_name,
        'count': len(values),
        'min': min(values),
        'max': max(values),
        'mean': sum(values) / len(values),
        'sum': sum(values)
    }


def list_available_geojson_files(base_path: str = "public/data") -> List[Dict[str, Any]]:
    """
    List all available GeoJSON files in directory
    """
    files_info = []

    if not os.path.exists(base_path):
        return files_info

    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('.geojson'):
                file_path = os.path.join(root, file)
                info = extract_file_info(file_path)
                info['path'] = file_path

                try:
                    data = load_geojson_file(file_path)
                    info['feature_count'] = count_features(data)
                    info['valid'] = validate_geojson(data)
                except Exception as e:
                    info['error'] = str(e)
                    info['valid'] = False

                files_info.append(info)

    return files_info


def merge_geojson_files(file_paths: List[str]) -> Dict[str, Any]:
    """
    Merge multiple GeoJSON files into one FeatureCollection
    """
    all_features = []

    for file_path in file_paths:
        try:
            data = load_geojson_file(file_path)
            if data.get('type') == 'FeatureCollection':
                all_features.extend(data.get('features', []))
            elif data.get('type') == 'Feature':
                all_features.append(data)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")

    return {
        'type': 'FeatureCollection',
        'features': all_features
    }
