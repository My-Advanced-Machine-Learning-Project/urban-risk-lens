# Data Directory

Place your training data here as `istanbul_2025_training.csv`.

## Required Columns

The training CSV must contain:

### Features (15 columns):
1. `toplam_nufus` - Total population
2. `toplam_bina` - Total building count
3. `vs30_mean` - Average shear-wave velocity (m/s)
4. `rjb_distance_km` - Distance to nearest fault (km)
5. `pga_scenario_mw72` - Peak ground acceleration for Mw 7.2 scenario (g)
6. `pga_scenario_mw75` - Peak ground acceleration for Mw 7.5 scenario (g)
7. `earthquake_min_distance_km` - Distance to nearest historical earthquake (km)
8. `earthquake_count_10km` - Count of earthquakes within 10km
9. `max_magnitude_nearby_20km` - Max magnitude within 20km
10. `strong_earthquakes_20km` - Count of M>5.0 earthquakes within 20km
11. `insan_etkisi` - Human impact index (0-1)
12. `bina_etkisi` - Building vulnerability index (0-1)
13. `zemin_etkisi` - Soil vulnerability index (0-1)
14. `altyapi_etkisi` - Infrastructure vulnerability index (0-1)
15. `barinma_etkisi` - Shelter vulnerability index (0-1)

### Targets (2 columns):
- `risk_score` - Continuous risk score (0.0 - 1.0) for regression
- `risk_class_5` - Ordinal risk class (1-5) for classification

### Optional (for identification):
- `mah_id` - Neighborhood ID
- `mahalle_adi` - Neighborhood name  
- `ilce_adi` - District name

## Example

```csv
mah_id,mahalle_adi,ilce_adi,toplam_nufus,toplam_bina,vs30_mean,...,risk_score,risk_class_5
192001,FATIH,ISTANBUL,15234,3456,287.5,...,0.45,3
192002,BEYOGLU,ISTANBUL,18432,4123,312.8,...,0.38,2
```

## Data Sources

- **Seismic**: Kandilli Observatory, AFAD, USGS, GEM/OpenQuake
- **Geotechnical**: İBB VS30 maps, AFAD microzoning
- **Exposure**: TÜİK (population), İBB Building Inventory
- **Vulnerability**: İBB Social Impact Index
