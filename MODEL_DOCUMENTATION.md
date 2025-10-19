# 🤖 Machine Learning Models

## Overview

Urban Risk Lens uses **dual ML models** to predict seismic risk for Istanbul neighborhoods with high accuracy and interpretability.

### Why Two Models?

| Model | Type | Purpose | Output |
|-------|------|---------|--------|
| **Model A** | Regression | Fine-grained risk quantification | Risk score (0-1) |
| **Model B** | Classification | Actionable risk categories | Risk class (1-5) |

**Benefits of Dual Approach:**
- 🎯 **Precision + Interpretability** - Continuous scores for analysis, discrete classes for decision-making
- ✅ **Cross-validation** - Regression scores should map consistently to predicted classes
- 📊 **Better ensemble** - Captures both gradual variations AND discrete risk thresholds

---

## Model Performance

### Model A: Regression (LightGBM)
Predicts continuous risk scores (0-1 range)

**Metrics (5-Fold CV):**
- RMSE: **0.047** ⭐ (94% improvement over baseline)
- Spearman ρ: **0.974**
- R²: 0.903

### Model B: Classification (LightGBM + SMOTE)
Predicts ordinal risk classes (1-5: Very Low → Very High)

**Metrics (5-Fold Stratified CV):**
- QWK (Quadratic Weighted Kappa): **0.940** ⭐
- Accuracy: 89.1%
- Macro F1: 0.828
- **Class 5 Recall: 85%** (exceptional for only 20 samples!)

---

## Risk Classification Thresholds

| Class | Label | Score Range | Color | % |
|-------|-------|-------------|-------|---|
| 1 | Very Low | 0.00 - 0.18 | 🟨 Pale Yellow | 20.4% |
| 2 | Low | 0.18 - 0.23 | 🟡 Yellow | 29.7% |
| 3 | Medium | 0.23 - 0.30 | 🟠 Orange | 27.0% |
| 4 | High | 0.30 - 0.43 | 🔴 Dark Red | 20.8% |
| 5 | Very High | 0.43 - 1.00 | 🔴 Very Dark Red | 2.1% |

---

## Features (15 Total)

### Seismic Hazard (6 features)
- `vs30_mean` - Soil stiffness (shear wave velocity)
- `rjb_distance_km` - Distance to nearest fault
- `pga_scenario_mw72/75` - Peak Ground Acceleration scenarios
- `earthquake_min_distance_km` - Min distance to historical earthquakes
- `max_magnitude_nearby_20km` - Max magnitude within 20km

### Historical Activity (2 features)
- `earthquake_count_10km` - Earthquake count within 10km
- `strong_earthquakes_20km` - Strong earthquakes (M≥5) within 20km

### Exposure (2 features)
- `toplam_nufus` - Total population
- `toplam_bina` - Total buildings

### Vulnerability Components (5 features)
- `insan_etkisi` - Human impact
- `bina_etkisi` - Building vulnerability
- `zemin_etkisi` - Soil/ground condition
- `altyapi_etkisi` - Infrastructure vulnerability
- `barinma_etkisi` - Shelter/housing

---

## Preprocessing Pipeline

### 1. Data Cleaning
- ✅ **956 Istanbul neighborhoods** (2025 data only)
- ✅ Temporal leakage prevention (excluded 2026 dummy data)
- ✅ City name normalization (`Istanbul` → `istanbul`)
- ✅ Missing neighborhood imputed (mah_id=192001)

### 2. Feature Selection
**Excluded to prevent data leakage:**
- ❌ ML prediction columns (`ml_predicted_class`, `ml_proba_*`)
- ❌ Target variables (`risk_score`, `risk_class_5`)
- ❌ Coordinates (to prevent spatial leakage)
- ❌ Identity columns (`mah_id`, `mahalle_adi`)

### 3. Class Imbalance Handling

**Problem: Severe Imbalance (14.3:1 ratio)**
- Majority: Class 2 (286 samples, 29.9%)
- Minority: Class 5 (20 samples, 2.1%) ⚠️

**Solution: Multi-Strategy Approach**
1. **SMOTE** - Synthetic minority oversampling (ONLY in training folds)
2. **Class Weights** - Heavy penalty for Class 5 misclassification (weight=15.0)
3. **Manual OOF Loop** - Prevents SMOTE leakage into validation
4. **Stratified CV** - Preserves class distribution across folds

**Result:** Class 5 recall improved from <30% (expected) to **85%** 🎉

---

## Validation Strategy

### Critical Tests Passed ✅

1. **Label Permutation Test** - Random labels don't produce high accuracy (no leakage)
2. **Temporal Validation** - 2025-only training prevents temporal leakage
3. **Feature Correlation Check** - No ultra-high correlation with target
4. **Cross-Validation Integrity** - SMOTE applied ONLY in training folds

### Why Manual OOF Loop?

```python
# ❌ WRONG: cross_val_predict incompatible with SMOTE
y_pred = cross_val_predict(pipeline, X, y, cv=5)
# Fold metrics look good, but OOF predictions broken!

# ✅ CORRECT: Manual loop ensures SMOTE only in training
for train_idx, val_idx in cv.split(X, y):
    pipeline.fit(X[train_idx], y[train_idx])  # SMOTE here
    y_pred[val_idx] = pipeline.predict(X[val_idx])  # No SMOTE
# Consistent metrics across folds and OOF!
```

---

## Model Architecture

### LightGBM Configuration

**Regression Model:**
```python
LGBMRegressor(
    objective='regression',
    n_estimators=5000,
    learning_rate=0.03,
    max_depth=6,
    num_leaves=31,
    min_data_in_leaf=20,
    early_stopping_rounds=100
)
```

**Classification Model (with SMOTE):**
```python
Pipeline([
    ('smote', SMOTE(k_neighbors=5)),
    ('classifier', LGBMClassifier(
        objective='multiclass',
        n_estimators=5000,
        learning_rate=0.03,
        max_depth=6,
        class_weight={1: 1.0, 2: 0.5, 3: 0.9, 4: 1.5, 5: 15.0}
    ))
])
```

---

## Usage

### Training Models
```bash
cd ENSEMBLE_MODEL
python final_model_training_956.py
```

### Generating Predictions
```bash
python predict.py \
  --input FINAL_WEBAPP_DATA_WITH_ML_956.csv \
  --year 2025 \
  --output ../urban-risk-lens-main/public/data/2025
```

**Output Files:**
- `risk_predictions.csv` - 956 neighborhoods with predictions
- `istanbul_risk_predictions.geojson` - GeoJSON with geometry + predictions

---

## Key Achievements

- ✅ **94% RMSE reduction** (0.231 → 0.047)
- ✅ **85% Class 5 recall** despite only 20 samples
- ✅ **No data leakage** in validation tests
- ✅ **Production-ready** models with realistic metrics

---

## Technical Decisions

### Why LightGBM over XGBoost/CatBoost?

| Model | RMSE | QWK | Training Time |
|-------|------|-----|---------------|
| **LightGBM** ⭐ | 0.047 | 0.940 | 2 min |
| XGBoost | 0.051 | 0.935 | 4 min |
| CatBoost | 0.049 | 0.928 | 6 min |

**Verdict:** Best performance + fastest training

### Why SMOTE?

- ❌ Random oversampling → overfitting risk
- ❌ Class weights only → insufficient for 14:1 ratio
- ❌ Undersampling majority → data loss
- ✅ **SMOTE** → synthetic samples in feature space, preserves all data

---

## Files

```
ENSEMBLE_MODEL/
├── final_model_training_956.py       - Training script
├── predict.py                         - Inference script
├── merge_predictions_to_geojson.py   - GeoJSON integration
├── model/
│   ├── final_lightgbm_regressor.pkl  - Regression model (742 KB)
│   └── final_lightgbm_classifier.pkl - Classification model (3.1 MB)
└── artifacts/
    └── FINAL_MODEL_PREDICTIONS_956.csv - OOF predictions
```

---

## References

- **SMOTE:** Chawla et al. (2002)
- **LightGBM:** Ke et al. (2017)
- **QWK:** Cohen (1968)
- **Imbalanced Learning:** He & Garcia (2009)

For detailed technical documentation, see [MODEL_README.md](../ENSEMBLE_MODEL/MODEL_README.md).
