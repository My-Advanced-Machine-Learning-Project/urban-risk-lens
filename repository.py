"""
Repository/DAO layer for database operations
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from datetime import datetime
from models import UrbanRiskData, RiskMetrics, DataSource


class UrbanRiskRepository:
    """
    Repository for UrbanRiskData operations
    """

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: Dict[str, Any]) -> UrbanRiskData:
        """Create new urban risk data entry"""
        db_item = UrbanRiskData(**data)
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_by_id(self, item_id: int) -> Optional[UrbanRiskData]:
        """Get urban risk data by ID"""
        return self.db.query(UrbanRiskData).filter(UrbanRiskData.id == item_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[UrbanRiskData]:
        """Get all urban risk data with pagination"""
        return self.db.query(UrbanRiskData).offset(skip).limit(limit).all()

    def get_by_location(self, location: str) -> List[UrbanRiskData]:
        """Get data by location"""
        return self.db.query(UrbanRiskData).filter(
            UrbanRiskData.location.ilike(f"%{location}%")
        ).all()

    def get_by_risk_score_range(self, min_score: float, max_score: float) -> List[UrbanRiskData]:
        """Get data within risk score range"""
        return self.db.query(UrbanRiskData).filter(
            and_(
                UrbanRiskData.risk_score >= min_score,
                UrbanRiskData.risk_score <= max_score
            )
        ).all()

    def get_high_risk_areas(self, threshold: float = 7.0) -> List[UrbanRiskData]:
        """Get areas with high risk scores"""
        return self.db.query(UrbanRiskData).filter(
            UrbanRiskData.risk_score >= threshold
        ).order_by(desc(UrbanRiskData.risk_score)).all()

    def update(self, item_id: int, data: Dict[str, Any]) -> Optional[UrbanRiskData]:
        """Update urban risk data"""
        db_item = self.get_by_id(item_id)
        if db_item:
            for key, value in data.items():
                setattr(db_item, key, value)
            db_item.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_item)
        return db_item

    def delete(self, item_id: int) -> bool:
        """Delete urban risk data"""
        db_item = self.get_by_id(item_id)
        if db_item:
            self.db.delete(db_item)
            self.db.commit()
            return True
        return False

    def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[UrbanRiskData]:
        """Bulk insert urban risk data"""
        db_items = [UrbanRiskData(**data) for data in data_list]
        self.db.add_all(db_items)
        self.db.commit()
        return db_items


class RiskMetricsRepository:
    """
    Repository for RiskMetrics operations
    """

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: Dict[str, Any]) -> RiskMetrics:
        """Create new risk metric"""
        db_item = RiskMetrics(**data)
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_by_urban_risk_id(self, urban_risk_id: int) -> List[RiskMetrics]:
        """Get all metrics for a specific urban risk data"""
        return self.db.query(RiskMetrics).filter(
            RiskMetrics.urban_risk_id == urban_risk_id
        ).all()

    def get_by_metric_name(self, metric_name: str) -> List[RiskMetrics]:
        """Get all metrics by name"""
        return self.db.query(RiskMetrics).filter(
            RiskMetrics.metric_name == metric_name
        ).all()

    def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[RiskMetrics]:
        """Bulk insert risk metrics"""
        db_items = [RiskMetrics(**data) for data in data_list]
        self.db.add_all(db_items)
        self.db.commit()
        return db_items


class DataSourceRepository:
    """
    Repository for DataSource operations
    """

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: Dict[str, Any]) -> DataSource:
        """Create new data source"""
        db_item = DataSource(**data)
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_by_name(self, source_name: str) -> Optional[DataSource]:
        """Get data source by name"""
        return self.db.query(DataSource).filter(
            DataSource.source_name == source_name
        ).first()

    def get_active_sources(self) -> List[DataSource]:
        """Get all active data sources"""
        return self.db.query(DataSource).filter(
            DataSource.is_active == True
        ).all()

    def update_last_updated(self, source_name: str) -> Optional[DataSource]:
        """Update last_updated timestamp for a data source"""
        db_item = self.get_by_name(source_name)
        if db_item:
            db_item.last_updated = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_item)
        return db_item
