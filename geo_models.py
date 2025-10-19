"""
PostGIS Spatial Models for GeoJSON data
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from geoalchemy2 import Geometry
from datetime import datetime
from database_config import Base


class MahalleRiskData(Base):
    """
    Mahalle (neighborhood) risk data with PostGIS geometry
    GeoJSON features için özel model
    """
    __tablename__ = 'mahalle_risk_data'

    id = Column(Integer, primary_key=True, index=True)

    # Basic information
    name = Column(String(255), index=True)
    clean_name = Column(String(255), index=True)
    mah_id = Column(Float)
    ilce_adi = Column(String(255), index=True)  # District name
    mahalle_adi = Column(String(255))  # Neighborhood name

    # Coordinates
    x = Column(Float)  # Longitude
    y = Column(Float)  # Latitude
    xcoord = Column(Float)
    ycoord = Column(Float)

    # PostGIS Geometry - SRID 4326 (WGS84)
    geometry = Column(Geometry('GEOMETRY', srid=4326), nullable=False)
    centroid = Column(Geometry('POINT', srid=4326))

    # Population and building data
    toplam_nufus = Column(Float)  # Total population
    toplam_bina = Column(Integer)  # Total buildings
    population_density = Column(Float)
    building_density = Column(Float)

    # Earthquake/Seismic data
    rjb_km = Column(Float)
    earthquake_min_distance_km = Column(Float)
    earthquake_mean_distance_km = Column(Float)
    earthquake_count_5km = Column(Float)
    earthquake_count_10km = Column(Float)
    earthquake_count_20km = Column(Float)
    earthquake_count_50km = Column(Float)
    max_magnitude_nearby_20km = Column(Float)
    mean_magnitude_nearby_20km = Column(Float)
    strong_earthquakes_20km = Column(Float)
    moderate_earthquakes_20km = Column(Float)
    seismic_intensity_factor = Column(Float)
    max_intensity_nearby = Column(Float)
    weighted_magnitude_by_distance = Column(Float)
    earthquake_density_50km = Column(Float)

    # PGA (Peak Ground Acceleration) data
    pga_scenario_mw72 = Column(Float)
    pga_scenario_mw75 = Column(Float)
    pga_ratio_mw75_72 = Column(Float)
    pga_total_scenario = Column(Float)
    pga_magnitude_sensitivity = Column(Float)
    earthquake_pga_mean = Column(Float)
    earthquake_pga_max = Column(Float)

    # Soil/Ground data
    vs30 = Column(Float)
    vs30_mean = Column(Float)
    vs30_combined = Column(Float)
    vs30_risk_level = Column(Float)

    # Risk factors (raw)
    insan_etkisi_raw = Column(Float)  # Human impact
    bina_etkisi_raw = Column(Float)  # Building impact
    zemin_etkisi_raw = Column(Float)  # Ground impact
    altyapi_etkisi_raw = Column(Float)  # Infrastructure impact
    barinma_etkisi_raw = Column(Float)  # Shelter impact

    # Risk factors (normalized)
    insan_etkisi_norm = Column(Float)
    bina_etkisi_norm = Column(Float)
    zemin_etkisi_norm = Column(Float)
    altyapi_etkisi_norm = Column(Float)
    barinma_etkisi_norm = Column(Float)

    # Composite risk scores
    bilesik_risk_skoru = Column(Float)  # Composite risk score
    risk_label_5li = Column(Float)  # 5-level risk label
    risk_label_normalized = Column(Float)

    # Distance metrics
    distance_to_city_center_km = Column(Float)
    distance_to_bosphorus_km = Column(Float)
    distance_to_marmara_km = Column(Float)

    # Fault and seismic indices
    fault_pga_interaction = Column(Float)
    fault_risk_factor = Column(Float)
    fault_proximity_level = Column(Float)
    total_seismic_exposure = Column(Float)
    comprehensive_earthquake_risk = Column(Float)
    seismic_hazard_index = Column(Float)

    # Vulnerability indices
    total_vulnerability = Column(Float)
    infrastructure_vulnerability = Column(Float)
    human_building_vulnerability = Column(Float)
    combined_risk_index = Column(Float)

    # GeoJSON properties as JSON (tüm ekstra alanlar için)
    properties = Column(JSON)

    # Metadata
    source_file = Column(String(500))  # Which GeoJSON file this came from
    year = Column(Integer)  # Year of prediction (if applicable)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<MahalleRiskData(id={self.id}, name='{self.name}', risk={self.bilesik_risk_skoru})>"


class SpatialIndex(Base):
    """
    Spatial index and reference table
    """
    __tablename__ = 'spatial_indices'

    id = Column(Integer, primary_key=True)
    index_name = Column(String(255), unique=True)
    table_name = Column(String(255))
    geometry_column = Column(String(255))
    srid = Column(Integer, default=4326)
    geometry_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SpatialIndex(name='{self.index_name}', table='{self.table_name}')>"
