"""
Example usage of the database repository
"""
from database_config import SessionLocal, init_db
from repository import UrbanRiskRepository, RiskMetricsRepository, DataSourceRepository


def example_create_data():
    """Example: Create new urban risk data"""
    db = SessionLocal()
    try:
        repo = UrbanRiskRepository(db)

        # Create single entry
        data = {
            "location": "Istanbul, Turkey",
            "latitude": 41.0082,
            "longitude": 28.9784,
            "risk_score": 7.5,
            "risk_category": "High",
            "population": 15462452,
            "data_source": "Government Survey"
        }

        result = repo.create(data)
        print(f"Created: {result}")

    finally:
        db.close()


def example_query_data():
    """Example: Query urban risk data"""
    db = SessionLocal()
    try:
        repo = UrbanRiskRepository(db)

        # Get all data
        all_data = repo.get_all(skip=0, limit=10)
        print(f"Total records: {len(all_data)}")

        # Get high risk areas
        high_risk = repo.get_high_risk_areas(threshold=7.0)
        print(f"High risk areas: {len(high_risk)}")

        # Search by location
        istanbul_data = repo.get_by_location("Istanbul")
        print(f"Istanbul records: {len(istanbul_data)}")

    finally:
        db.close()


def example_bulk_insert():
    """Example: Bulk insert data"""
    db = SessionLocal()
    try:
        repo = UrbanRiskRepository(db)

        data_list = [
            {
                "location": "Ankara, Turkey",
                "latitude": 39.9334,
                "longitude": 32.8597,
                "risk_score": 6.2,
                "risk_category": "Medium",
                "population": 5663322
            },
            {
                "location": "Izmir, Turkey",
                "latitude": 38.4237,
                "longitude": 27.1428,
                "risk_score": 7.8,
                "risk_category": "High",
                "population": 4367251
            }
        ]

        results = repo.bulk_create(data_list)
        print(f"Bulk inserted {len(results)} records")

    finally:
        db.close()


def example_with_metrics():
    """Example: Create data with related metrics"""
    db = SessionLocal()
    try:
        # Create urban risk data
        risk_repo = UrbanRiskRepository(db)
        risk_data = risk_repo.create({
            "location": "Test City",
            "latitude": 40.0,
            "longitude": 29.0,
            "risk_score": 8.5,
            "risk_category": "Very High"
        })

        # Create related metrics
        metrics_repo = RiskMetricsRepository(db)
        metrics = [
            {
                "urban_risk_id": risk_data.id,
                "metric_name": "earthquake_risk",
                "metric_value": 8.5,
                "metric_unit": "magnitude"
            },
            {
                "urban_risk_id": risk_data.id,
                "metric_name": "flood_risk",
                "metric_value": 6.2,
                "metric_unit": "severity"
            }
        ]

        metrics_repo.bulk_create(metrics)
        print(f"Created risk data with {len(metrics)} metrics")

    finally:
        db.close()


if __name__ == "__main__":
    # Initialize database (create tables)
    print("Initializing database...")
    init_db()

    # Run examples
    print("\n--- Example 1: Create Data ---")
    example_create_data()

    print("\n--- Example 2: Query Data ---")
    example_query_data()

    print("\n--- Example 3: Bulk Insert ---")
    example_bulk_insert()

    print("\n--- Example 4: Data with Metrics ---")
    example_with_metrics()
