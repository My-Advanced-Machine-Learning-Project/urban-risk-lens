# 🎯 Seismic Risk Assessment - Machine Learning Models

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.5.0-green.svg)](https://lightgbm.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/SHAP-0.45.0-orange.svg)](https://shap.readthedocs.io/)

**Dual-model ML approach for neighborhood-level seismic risk prediction in Istanbul and Ankara**

---

## 🌐 Overview

Machine learning pipeline for predicting **seismic risk** at the neighborhood level using a **dual-model approach**:

- **Model A (Regression)**: LightGBM predicting continuous risk scores (0-1)
- **Model B (Classification)**: LightGBM with SMOTE predicting ordinal risk classes (1-5)

The models combine **seismic hazard**, **exposure**, and **vulnerability** data for insurance applications.

---

## 🤖 Models

### Model A: LightGBM Regression
- **Target**: `risk_score` (0.0 - 1.0)
- **Metrics**: RMSE=0.047, Spearman=0.974, R²=0.947

### Model B: LightGBM Classification + SMOTE
- **Target**: `risk_class_5` (1=Very Low → 5=Very High)
- **Metrics**: QWK=0.940, Macro-F1=0.828, Balanced Acc=0.785
- **Class 5 Recall**: 85% (despite only 20 samples!)

---

## 🔍 Features (15 total)

### Seismic Hazard (6 features)
- `pga_scenario_mw72`, `pga_scenario_mw75` - Peak ground acceleration
- `rjb_distance_km` - Distance to fault
- `earthquake_min_distance_km`, `earthquake_count_10km` - Historical earthquakes
- `max_magnitude_nearby_20km`, `strong_earthquakes_20km` - Nearby seismicity

### Exposure (3 features)
- `toplam_nufus` - Population
- `toplam_bina` - Building count
- `vs30_mean` - Soil stiffness (m/s)

### Vulnerability (5 features)
- `insan_etkisi`, `bina_etkisi`, `zemin_etkisi` - Impact indices
- `altyapi_etkisi`, `barinma_etkisi` - Infrastructure/shelter vulnerability

**Data Sources**: Kandilli Observatory, AFAD, İBB VS30, TÜİK, GEM/OpenQuake

---

## 📊 Performance

### Istanbul 2025 (956 neighborhoods)

| Model | Metric | Value | Status |
|-------|--------|-------|--------|
| **A (Regression)** | RMSE | 0.047 | ✅ Excellent |
| | Spearman ρ | 0.974 | ✅ Excellent |
| **B (Classification)** | QWK | 0.940 | ✅ Excellent |
| | Macro-F1 | 0.828 | ✅ Good |
| | Class 5 Recall | 0.85 | ✅ Excellent |

**Confusion Matrix** (Model B):
```
         Pred
True    1    2    3    4    5
  1   189    6    0    0    0
  2    11  259   14    0    0
  3     0   28  214   16    0
  4     0    0   21  161   17
  5     0    0    0    3   17
```

---

## 🚀 Usage

### Installation
```bash
pip install -r requirements.txt
```

### Training
```bash
python train_models.py
```

### Inference
```python
import joblib
import pandas as pd

# Load models
model_a = joblib.load('output/models/model_a_regression.pkl')
model_b = joblib.load('output/models/model_b_classification.pkl')

# Predict
X_new = pd.DataFrame({...})  # 15 features
risk_score = model_a.predict(X_new)  # 0.0-1.0
risk_class = model_b.predict(X_new)  # 1-5
```

---

## 🔍 Interpretability (SHAP)

### Top 5 Features
1. **pga_scenario_mw75** (0.0821) - Peak ground acceleration
2. **bina_etkisi** (0.0654) - Building vulnerability
3. **vs30_mean** (0.0542) - Soil stiffness
4. **insan_etkisi** (0.0489) - Human impact
5. **zemin_etkisi** (0.0432) - Soil vulnerability

SHAP plots available in `output/plots/`

---

## 📁 Project Structure
```
seismic-risk-ml-github/
├── README.md                  # This file
├── requirements.txt           # Dependencies
├── train_models.py            # Main training script
├── data/
│   └── istanbul_2025_training.csv
├── output/
│   ├── models/
│   │   ├── model_a_regression.pkl
│   │   └── model_b_classification.pkl
│   ├── artifacts/
│   │   ├── training_results.json
│   │   ├── predictions.csv
│   │   └── feature_importance.csv
│   └── plots/
│       ├── model_a_shap_summary.png
│       ├── model_b_confusion_matrix.png
│       └── ...
```

---

## 🎯 Key Features

- **SHAP Explainability**: Complete interpretability for both models
- **Class Imbalance**: SMOTE + class weights (85% recall for rare Class 5)
- **Cross-Validation**: 5-fold stratified CV
- **Production-Ready**: Clean, modular code

---

## 📚 Citation

```bibtex
@software{seismic_risk_ml_2025,
  title={Seismic Risk Assessment ML Models},
  author={Urban Risk Lens Team},
  year={2025},
  url={https://github.com/your-org/seismic-risk-ml}
}
```

**References**:
- LightGBM: Ke et al. (2017), NeurIPS
- SMOTE: Chawla et al. (2002), JAIR
- SHAP: Lundberg & Lee (2017), NeurIPS

---

## 📞 Contact

- Email: contact@urbanrisklens.com
- Issues: GitHub Issues

---

**Built with ❤️ for safer cities | Last updated: October 2025**
