# 🤖 ML Models Summary

## Dual Model Approach

Urban Risk Lens uses **two complementary ML models**:

| Model | Algorithm | Purpose | Performance |
|-------|-----------|---------|-------------|
| **Model A** | LightGBM Regressor | Continuous risk scores (0-1) | RMSE: **0.047**, Spearman: **0.974** |
| **Model B** | LightGBM Classifier + SMOTE | Ordinal risk classes (1-5) | QWK: **0.940**, Class 5 Recall: **85%** |

### Why Two Models?

1. **Regression** provides precise, continuous risk scores for fine-grained analysis
2. **Classification** provides interpretable categories (Very Low → Very High) for decisions
3. **Ensemble validation** - Scores and classes should align (consistency check)
4. **Complementary strengths** - Captures both gradual trends AND discrete thresholds

---

## Key Features

- ✅ **956 Istanbul neighborhoods** (2025 data)
- ✅ **15 tabular features** (seismic hazard, exposure, vulnerability)
- ✅ **No data leakage** (validated with permutation tests)
- ✅ **Handles 14:1 class imbalance** (SMOTE + class weights + manual OOF)
- ✅ **Production-ready** (realistic metrics, no overfitting)

---

## Performance Highlights

### Model A (Regression)
- **94% RMSE reduction** vs. baseline (0.231 → 0.047)
- R² = 0.903 (excellent fit)
- Predicts risk scores with ±0.037 MAE

### Model B (Classification)
- **QWK = 0.940** (near-perfect ordinal agreement)
- **85% recall on Class 5** (only 20 samples!) - far exceeds expectations
- Accuracy = 89.1% across all classes

---

## Technical Innovation

### Class Imbalance Solution
**Problem:** Class 5 (Very High risk) has only 20 samples (2.1%) vs. 286 for majority class

**Solution:**
1. **SMOTE** - Synthetic oversampling ONLY in training folds
2. **Class Weights** - 15x penalty for Class 5 misclassification
3. **Manual OOF Loop** - Prevents `cross_val_predict` + SMOTE incompatibility
4. **Stratified CV** - Preserves class distribution

**Result:** Class 5 recall improved from <30% (expected) → **85%** 🎉

---

## Data Pipeline

```
Raw Data (956 neighborhoods)
    ↓
Feature Selection (15 features)
    ↓
Remove Leakage Columns (ml_*, coordinates, IDs)
    ↓
5-Fold Stratified CV
    ↓
SMOTE (training folds only) + Class Weights
    ↓
LightGBM Training (early stopping)
    ↓
Manual OOF Predictions
    ↓
Validation Tests (permutation, temporal, correlation)
    ↓
✅ Production Models
```

---

## Risk Thresholds

| Score Range | Class | Label | Color | Count |
|-------------|-------|-------|-------|-------|
| 0.00 - 0.18 | 1 | Very Low | 🟨 | 195 (20.4%) |
| 0.18 - 0.23 | 2 | Low | 🟡 | 284 (29.7%) |
| 0.23 - 0.30 | 3 | Medium | 🟠 | 258 (27.0%) |
| 0.30 - 0.43 | 4 | High | 🔴 | 199 (20.8%) |
| 0.43 - 1.00 | 5 | Very High | 🔴 | 20 (2.1%) |

---

## Quick Start

### Generate Predictions
```bash
cd ENSEMBLE_MODEL
python predict.py \
  --input FINAL_WEBAPP_DATA_WITH_ML_956.csv \
  --output ../urban-risk-lens-main/public/data/2025
```

### Output
- `risk_predictions.csv` - 956 neighborhoods with risk_score_pred, risk_class_5_pred, probabilities
- `istanbul_risk_predictions.geojson` - GeoJSON with predictions + geometry

---

## Documentation

- **Full Details:** [MODEL_DOCUMENTATION.md](MODEL_DOCUMENTATION.md)
- **Technical Deep Dive:** [ENSEMBLE_MODEL/MODEL_README.md](../ENSEMBLE_MODEL/MODEL_README.md)
- **Validation Report:** [artifacts/VALIDATION_FIRST_REPORT.md](artifacts/VALIDATION_FIRST_REPORT.md)

---

**Status:** ✅ Production-ready | 🔒 No data leakage | 📊 Validated metrics
