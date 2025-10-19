"""
Spatial/Geographic Repository for PostGIS operations
"""
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from geoalchemy2 import WKTElement
from geoalchemy2.functions import ST_AsGeoJSON, ST_Distance, ST_DWithin, ST_Intersects, \
    ST_Contains, ST_Within, ST_Area, ST_Centroid, ST_MakeValid, ST_GeomFromGeoJSON
import json
from geo_models import MahalleRiskData, SpatialIndex


class GeoSpatialRepository:
    """
    Repository for spatial/geographic queries using PostGIS
    """

    def __init__(self, db: Session):
        self.db = db

    def create_from_geojson_feature(self, feature: Dict[str, Any],
                                   source_file: str = None,
                                   year: int = None) -> MahalleRiskData:
        """
        Create a MahalleRiskData entry from a GeoJSON feature
        """
        properties = feature.get('properties', {})
        geometry = feature.get('geometry', {})

        # Convert geometry to GeoJSON string for PostGIS
        geom_json = json.dumps(geometry)

        data = {
            'name': properties.get('Name'),
            'clean_name': properties.get('clean_name'),
            'mah_id': properties.get('mah_id'),
            'ilce_adi': properties.get('ilce_adi'),
            'mahalle_adi': properties.get('mahalle_adi'),
            'x': properties.get('X'),
            'y': properties.get('Y'),
            'xcoord': properties.get('xcoord'),
            'ycoord': properties.get('ycoord'),

            # Population and buildings
            'toplam_nufus': properties.get('toplam_nufus'),
            'toplam_bina': properties.get('toplam_bina'),
            'population_density': properties.get('population_density'),
            'building_density': properties.get('building_density'),

            # Earthquake data
            'rjb_km': properties.get('rjb_km'),
            'earthquake_min_distance_km': properties.get('earthquake_min_distance_km'),
            'earthquake_mean_distance_km': properties.get('earthquake_mean_distance_km'),
            'earthquake_count_5km': properties.get('earthquake_count_5km'),
            'earthquake_count_10km': properties.get('earthquake_count_10km'),
            'earthquake_count_20km': properties.get('earthquake_count_20km'),
            'earthquake_count_50km': properties.get('earthquake_count_50km'),
            'max_magnitude_nearby_20km': properties.get('max_magnitude_nearby_20km'),
            'mean_magnitude_nearby_20km': properties.get('mean_magnitude_nearby_20km'),
            'strong_earthquakes_20km': properties.get('strong_earthquakes_20km'),
            'moderate_earthquakes_20km': properties.get('moderate_earthquakes_20km'),
            'seismic_intensity_factor': properties.get('seismic_intensity_factor'),
            'max_intensity_nearby': properties.get('max_intensity_nearby'),
            'weighted_magnitude_by_distance': properties.get('weighted_magnitude_by_distance'),
            'earthquake_density_50km': properties.get('earthquake_density_50km'),

            # PGA data
            'pga_scenario_mw72': properties.get('pga_scenario_mw72'),
            'pga_scenario_mw75': properties.get('pga_scenario_mw75'),
            'pga_ratio_mw75_72': properties.get('pga_ratio_mw75_72'),
            'pga_total_scenario': properties.get('pga_total_scenario'),
            'pga_magnitude_sensitivity': properties.get('pga_magnitude_sensitivity'),
            'earthquake_pga_mean': properties.get('earthquake_pga_mean'),
            'earthquake_pga_max': properties.get('earthquake_pga_max'),

            # Soil data
            'vs30': properties.get('vs30'),
            'vs30_mean': properties.get('vs30_mean'),
            'vs30_combined': properties.get('vs30_combined'),
            'vs30_risk_level': properties.get('vs30_risk_level'),

            # Risk factors
            'insan_etkisi_raw': properties.get('insan_etkisi_raw'),
            'bina_etkisi_raw': properties.get('bina_etkisi_raw'),
            'zemin_etkisi_raw': properties.get('zemin_etkisi_raw'),
            'altyapi_etkisi_raw': properties.get('altyapi_etkisi_raw'),
            'barinma_etkisi_raw': properties.get('barinma_etkisi_raw'),
            'insan_etkisi_norm': properties.get('insan_etkisi_norm'),
            'bina_etkisi_norm': properties.get('bina_etkisi_norm'),
            'zemin_etkisi_norm': properties.get('zemin_etkisi_norm'),
            'altyapi_etkisi_norm': properties.get('altyapi_etkisi_norm'),
            'barinma_etkisi_norm': properties.get('barinma_etkisi_norm'),

            # Risk scores
            'bilesik_risk_skoru': properties.get('bilesik_risk_skoru'),
            'risk_label_5li': properties.get('risk_label_5li'),
            'risk_label_normalized': properties.get('risk_label_normalized'),

            # Distances
            'distance_to_city_center_km': properties.get('distance_to_city_center_km'),
            'distance_to_bosphorus_km': properties.get('distance_to_bosphorus_km'),
            'distance_to_marmara_km': properties.get('distance_to_marmara_km'),

            # Fault and indices
            'fault_pga_interaction': properties.get('fault_pga_interaction'),
            'fault_risk_factor': properties.get('fault_risk_factor'),
            'fault_proximity_level': properties.get('fault_proximity_level'),
            'total_seismic_exposure': properties.get('total_seismic_exposure'),
            'comprehensive_earthquake_risk': properties.get('comprehensive_earthquake_risk'),
            'seismic_hazard_index': properties.get('seismic_hazard_index'),

            # Vulnerabilities
            'total_vulnerability': properties.get('total_vulnerability'),
            'infrastructure_vulnerability': properties.get('infrastructure_vulnerability'),
            'human_building_vulnerability': properties.get('human_building_vulnerability'),
            'combined_risk_index': properties.get('combined_risk_index'),

            # Store all properties as JSON
            'properties': properties,

            # Metadata
            'source_file': source_file,
            'year': year,
        }

        # Create geometry from GeoJSON
        db_item = MahalleRiskData(**data)

        # Set geometry using ST_GeomFromGeoJSON
        self.db.add(db_item)
        self.db.flush()

        # Update geometry using raw SQL
        self.db.execute(
            text(f"""
                UPDATE mahalle_risk_data
                SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326),
                    centroid = ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326))
                WHERE id = :id
            """),
            {"geom_json": geom_json, "id": db_item.id}
        )

        self.db.commit()
        self.db.refresh(db_item)

        return db_item

    def bulk_import_geojson(self, geojson_data: Dict[str, Any],
                           source_file: str = None,
                           year: int = None) -> List[MahalleRiskData]:
        """
        Bulk import from GeoJSON FeatureCollection
        """
        features = geojson_data.get('features', [])
        results = []

        for feature in features:
            try:
                item = self.create_from_geojson_feature(feature, source_file, year)
                results.append(item)
            except Exception as e:
                print(f"Error importing feature: {e}")
                continue

        return results

    def get_by_id(self, item_id: int) -> Optional[MahalleRiskData]:
        """Get data by ID"""
        return self.db.query(MahalleRiskData).filter(MahalleRiskData.id == item_id).first()

    def get_by_name(self, name: str) -> List[MahalleRiskData]:
        """Get data by neighborhood name"""
        return self.db.query(MahalleRiskData).filter(
            or_(
                MahalleRiskData.name.ilike(f"%{name}%"),
                MahalleRiskData.clean_name.ilike(f"%{name}%"),
                MahalleRiskData.mahalle_adi.ilike(f"%{name}%")
            )
        ).all()

    def get_by_district(self, district: str) -> List[MahalleRiskData]:
        """Get all neighborhoods in a district"""
        return self.db.query(MahalleRiskData).filter(
            MahalleRiskData.ilce_adi.ilike(f"%{district}%")
        ).all()

    def get_high_risk_areas(self, threshold: float = 0.2) -> List[MahalleRiskData]:
        """Get high risk areas above threshold"""
        return self.db.query(MahalleRiskData).filter(
            MahalleRiskData.bilesik_risk_skoru >= threshold
        ).order_by(MahalleRiskData.bilesik_risk_skoru.desc()).all()

    def find_within_distance(self, longitude: float, latitude: float,
                            distance_km: float) -> List[MahalleRiskData]:
        """
        Find all areas within specified distance from a point
        Uses PostGIS ST_DWithin for efficient spatial query
        """
        point = f'POINT({longitude} {latitude})'

        return self.db.query(MahalleRiskData).filter(
            func.ST_DWithin(
                MahalleRiskData.geometry,
                func.ST_SetSRID(func.ST_GeomFromText(point), 4326)::Geography,
                distance_km * 1000  # Convert km to meters
            )
        ).all()

    def find_nearest(self, longitude: float, latitude: float,
                    limit: int = 10) -> List[Tuple[MahalleRiskData, float]]:
        """
        Find nearest areas to a point
        Returns list of (area, distance_km) tuples
        """
        point = f'POINT({longitude} {latitude})'

        results = self.db.query(
            MahalleRiskData,
            func.ST_Distance(
                MahalleRiskData.geometry,
                func.ST_SetSRID(func.ST_GeomFromText(point), 4326)::Geography
            ).label('distance')
        ).order_by('distance').limit(limit).all()

        # Convert distance from meters to km
        return [(area, dist / 1000) for area, dist in results]

    def find_intersecting(self, geometry_geojson: Dict[str, Any]) -> List[MahalleRiskData]:
        """
        Find areas that intersect with given geometry
        """
        geom_json = json.dumps(geometry_geojson)

        return self.db.query(MahalleRiskData).filter(
            func.ST_Intersects(
                MahalleRiskData.geometry,
                func.ST_SetSRID(func.ST_GeomFromGeoJSON(geom_json), 4326)
            )
        ).all()

    def get_as_geojson(self, item_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a single item as GeoJSON
        """
        result = self.db.query(
            MahalleRiskData.id,
            MahalleRiskData.properties,
            func.ST_AsGeoJSON(MahalleRiskData.geometry).label('geometry')
        ).filter(MahalleRiskData.id == item_id).first()

        if not result:
            return None

        return {
            "type": "Feature",
            "id": result.id,
            "properties": result.properties,
            "geometry": json.loads(result.geometry)
        }

    def get_all_as_geojson(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """
        Get multiple items as GeoJSON FeatureCollection
        """
        results = self.db.query(
            MahalleRiskData.id,
            MahalleRiskData.properties,
            func.ST_AsGeoJSON(MahalleRiskData.geometry).label('geometry')
        ).offset(skip).limit(limit).all()

        features = []
        for result in results:
            features.append({
                "type": "Feature",
                "id": result.id,
                "properties": result.properties,
                "geometry": json.loads(result.geometry)
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_statistics_by_district(self, district: str) -> Dict[str, Any]:
        """
        Get aggregated statistics for a district
        """
        stats = self.db.query(
            func.count(MahalleRiskData.id).label('count'),
            func.avg(MahalleRiskData.bilesik_risk_skoru).label('avg_risk'),
            func.max(MahalleRiskData.bilesik_risk_skoru).label('max_risk'),
            func.min(MahalleRiskData.bilesik_risk_skoru).label('min_risk'),
            func.sum(MahalleRiskData.toplam_nufus).label('total_population'),
            func.sum(MahalleRiskData.toplam_bina).label('total_buildings')
        ).filter(
            MahalleRiskData.ilce_adi.ilike(f"%{district}%")
        ).first()

        return {
            'district': district,
            'neighborhood_count': stats.count,
            'average_risk': float(stats.avg_risk) if stats.avg_risk else 0,
            'max_risk': float(stats.max_risk) if stats.max_risk else 0,
            'min_risk': float(stats.min_risk) if stats.min_risk else 0,
            'total_population': int(stats.total_population) if stats.total_population else 0,
            'total_buildings': int(stats.total_buildings) if stats.total_buildings else 0
        }

    def create_spatial_index(self):
        """
        Create spatial index on geometry column for faster queries
        """
        self.db.execute(
            text("""
                CREATE INDEX IF NOT EXISTS idx_mahalle_risk_geometry
                ON mahalle_risk_data USING GIST (geometry);
            """)
        )
        self.db.commit()
