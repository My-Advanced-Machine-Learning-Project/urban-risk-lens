#!/usr/bin/env python3
"""
🎯 Seismic Risk Assessment - Model Training Pipeline
====================================================
Dual model approach for neighborhood-level seismic risk prediction

Model A: LightGBM Regression (risk_score 0-1)
Model B: LightGBM Classification (risk_class 1-5) with SMOTE

Author: Seismic Risk ML Team
Date: October 2025
"""

import pandas as pd
import numpy as np
import json
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# ML libraries
import lightgbm as lgb
import shap
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    cohen_kappa_score, classification_report, confusion_matrix,
    balanced_accuracy_score, f1_score
)
from scipy.stats import spearmanr
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

# Reproducibility
SEED = 42
np.random.seed(SEED)

# ============================================================================
# CONFIGURATION
# ============================================================================
class Config:
    """Model training configuration"""
    # Paths
    SCRIPT_DIR = Path(__file__).parent
    DATA_FILE = SCRIPT_DIR / 'data' / 'istanbul_2025_training.csv'
    OUTPUT_DIR = SCRIPT_DIR / 'output'
    MODEL_DIR = OUTPUT_DIR / 'models'
    ARTIFACTS_DIR = OUTPUT_DIR / 'artifacts'
    PLOTS_DIR = OUTPUT_DIR / 'plots'

    # Create directories
    for d in [OUTPUT_DIR, MODEL_DIR, ARTIFACTS_DIR, PLOTS_DIR]:
        d.mkdir(exist_ok=True, parents=True)

    # Features (15 tabular features)
    FEATURES = [
        'toplam_nufus', 'toplam_bina', 'vs30_mean', 'rjb_distance_km',
        'pga_scenario_mw72', 'pga_scenario_mw75',
        'earthquake_min_distance_km', 'earthquake_count_10km',
        'max_magnitude_nearby_20km', 'strong_earthquakes_20km',
        'insan_etkisi', 'bina_etkisi', 'zemin_etkisi',
        'altyapi_etkisi', 'barinma_etkisi'
    ]

    # Targets
    TARGET_REGRESSION = 'risk_score'
    TARGET_CLASSIFICATION = 'risk_class_5'

    # Model A: Regression
    MODEL_A_PARAMS = {
        'objective': 'regression',
        'metric': 'rmse',
        'learning_rate': 0.05,
        'num_leaves': 63,
        'min_data_in_leaf': 25,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 1,
        'lambda_l1': 1.0,
        'lambda_l2': 2.0,
        'n_estimators': 500,
        'random_state': SEED,
        'verbose': -1
    }

    # Model B: Classification
    MODEL_B_PARAMS = {
        'objective': 'multiclass',
        'num_class': 5,
        'metric': 'multi_logloss',
        'learning_rate': 0.05,
        'num_leaves': 63,
        'min_data_in_leaf': 25,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 1,
        'lambda_l1': 1.0,
        'lambda_l2': 2.0,
        'n_estimators': 500,
        'random_state': SEED,
        'verbose': -1
    }

    # Class weights for imbalanced data
    CLASS_WEIGHTS = {1: 1.0, 2: 0.5, 3: 0.9, 4: 1.5, 5: 15.0}

    # Cross-validation
    CV_FOLDS = 5

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def print_header(text, char='=', width=80):
    """Print formatted header"""
    print(f"\n{char * width}")
    print(f"{text.center(width)}")
    print(f"{char * width}\n")

def print_section(text):
    """Print section header"""
    print(f"\n{'─' * 80}")
    print(f"▶ {text}")
    print(f"{'─' * 80}")

def save_json(data, filepath):
    """Save data to JSON file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved: {filepath.name}")

# ============================================================================
# MODEL A: REGRESSION
# ============================================================================
def train_model_a(X, y):
    """
    Train Model A: LightGBM Regression for risk_score (0-1)

    Returns:
        - model: Trained LightGBM regressor
        - metrics: Cross-validation metrics
        - predictions: OOF predictions
        - shap_values: SHAP values for interpretability
    """
    print_section("MODEL A: REGRESSION (risk_score)")

    # Cross-validation
    print(f"Running {Config.CV_FOLDS}-Fold Cross-Validation...")
    kf = KFold(n_splits=Config.CV_FOLDS, shuffle=True, random_state=SEED)

    cv_metrics = []
    oof_predictions = np.zeros(len(X))
    fold_models = []

    for fold_idx, (train_idx, val_idx) in enumerate(kf.split(X), 1):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        # Train
        model = lgb.LGBMRegressor(**Config.MODEL_A_PARAMS)
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)],
                 callbacks=[lgb.early_stopping(50, verbose=False)])

        # Predict
        y_val_pred = model.predict(X_val)
        oof_predictions[val_idx] = y_val_pred

        # Metrics
        rmse = np.sqrt(mean_squared_error(y_val, y_val_pred))
        mae = mean_absolute_error(y_val, y_val_pred)
        r2 = r2_score(y_val, y_val_pred)
        spearman = spearmanr(y_val, y_val_pred)[0]

        cv_metrics.append({
            'fold': fold_idx,
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2),
            'spearman': float(spearman)
        })

        fold_models.append(model)
        print(f"  Fold {fold_idx}: RMSE={rmse:.6f}, MAE={mae:.6f}, Spearman={spearman:.4f}")

    # Overall metrics
    overall_rmse = np.sqrt(mean_squared_error(y, oof_predictions))
    overall_mae = mean_absolute_error(y, oof_predictions)
    overall_r2 = r2_score(y, oof_predictions)
    overall_spearman = spearmanr(y, oof_predictions)[0]

    print(f"\n  📊 Overall CV Results:")
    print(f"     RMSE:     {overall_rmse:.6f}")
    print(f"     MAE:      {overall_mae:.6f}")
    print(f"     R²:       {overall_r2:.4f}")
    print(f"     Spearman: {overall_spearman:.4f}")

    # Train final model on all data
    print(f"\n  Training final model on full dataset...")
    final_model = lgb.LGBMRegressor(**Config.MODEL_A_PARAMS)
    final_model.fit(X, y)

    # SHAP analysis
    print(f"\n  Computing SHAP values...")
    explainer = shap.TreeExplainer(final_model)
    shap_values = explainer.shap_values(X)

    # Save SHAP summary plot
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X, feature_names=Config.FEATURES,
                     show=False, max_display=15)
    plt.tight_layout()
    shap_plot_path = Config.PLOTS_DIR / 'model_a_shap_summary.png'
    plt.savefig(shap_plot_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  ✓ SHAP plot saved: {shap_plot_path.name}")

    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': Config.FEATURES,
        'importance': final_model.feature_importances_,
        'shap_importance': np.abs(shap_values).mean(axis=0)
    }).sort_values('importance', ascending=False)

    # Plot feature importance
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    # LightGBM importance
    top_features = feature_importance.head(15)
    ax1.barh(range(len(top_features)), top_features['importance'])
    ax1.set_yticks(range(len(top_features)))
    ax1.set_yticklabels(top_features['feature'])
    ax1.set_xlabel('Importance (Gain)')
    ax1.set_title('Model A: Feature Importance (LightGBM)')
    ax1.invert_yaxis()

    # SHAP importance
    top_shap = feature_importance.sort_values('shap_importance', ascending=False).head(15)
    ax2.barh(range(len(top_shap)), top_shap['shap_importance'])
    ax2.set_yticks(range(len(top_shap)))
    ax2.set_yticklabels(top_shap['feature'])
    ax2.set_xlabel('SHAP Importance (Mean |SHAP|)')
    ax2.set_title('Model A: Feature Importance (SHAP)')
    ax2.invert_yaxis()

    plt.tight_layout()
    importance_plot_path = Config.PLOTS_DIR / 'model_a_feature_importance.png'
    plt.savefig(importance_plot_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  ✓ Feature importance plot saved: {importance_plot_path.name}")

    results = {
        'model': final_model,
        'oof_predictions': oof_predictions,
        'cv_metrics': cv_metrics,
        'overall_metrics': {
            'rmse': float(overall_rmse),
            'mae': float(overall_mae),
            'r2': float(overall_r2),
            'spearman': float(overall_spearman)
        },
        'feature_importance': feature_importance,
        'shap_values': shap_values
    }

    return results

# ============================================================================
# MODEL B: CLASSIFICATION
# ============================================================================
def train_model_b(X, y):
    """
    Train Model B: LightGBM Classification for risk_class_5 (1-5) with SMOTE

    Returns:
        - model: Trained LightGBM classifier with SMOTE pipeline
        - metrics: Cross-validation metrics
        - predictions: OOF predictions and probabilities
    """
    print_section("MODEL B: CLASSIFICATION (risk_class_5) with SMOTE")

    # Class distribution
    print(f"Class distribution:")
    class_counts = y.value_counts().sort_index()
    for cls, count in class_counts.items():
        pct = 100 * count / len(y)
        print(f"  Class {cls}: {count:3d} ({pct:5.1f}%)")

    # LightGBM Classifier with class weights
    lgb_clf = lgb.LGBMClassifier(
        **Config.MODEL_B_PARAMS,
        class_weight=Config.CLASS_WEIGHTS
    )

    # SMOTE pipeline
    pipeline = ImbPipeline([
        ('smote', SMOTE(k_neighbors=5, random_state=SEED,
                       sampling_strategy='not majority')),
        ('classifier', lgb_clf)
    ])

    # Cross-validation
    print(f"\nRunning {Config.CV_FOLDS}-Fold Stratified Cross-Validation with SMOTE...")
    skf = StratifiedKFold(n_splits=Config.CV_FOLDS, shuffle=True, random_state=SEED)

    X_np = X.to_numpy()
    y_np = y.to_numpy()

    oof_predictions = np.zeros_like(y_np)
    oof_probabilities = np.zeros((len(y_np), 5))
    cv_metrics = []

    for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X_np, y_np), 1):
        X_train, X_val = X_np[train_idx], X_np[val_idx]
        y_train, y_val = y_np[train_idx], y_np[val_idx]

        # Train with SMOTE
        pipeline.fit(X_train, y_train)

        # Predict
        y_val_pred = pipeline.predict(X_val)
        y_val_proba = pipeline.predict_proba(X_val)

        # Store OOF predictions
        oof_predictions[val_idx] = y_val_pred
        oof_probabilities[val_idx] = y_val_proba

        # Metrics
        qwk = cohen_kappa_score(y_val, y_val_pred, weights='quadratic')
        macro_f1 = f1_score(y_val, y_val_pred, average='macro')
        balanced_acc = balanced_accuracy_score(y_val, y_val_pred)

        cv_metrics.append({
            'fold': fold_idx,
            'qwk': float(qwk),
            'macro_f1': float(macro_f1),
            'balanced_accuracy': float(balanced_acc)
        })

        print(f"  Fold {fold_idx}: QWK={qwk:.4f}, Macro-F1={macro_f1:.4f}, BalAcc={balanced_acc:.4f}")

    # Overall metrics
    overall_qwk = cohen_kappa_score(y, oof_predictions, weights='quadratic')
    overall_macro_f1 = f1_score(y, oof_predictions, average='macro')
    overall_balanced_acc = balanced_accuracy_score(y, oof_predictions)

    print(f"\n  📊 Overall CV Results:")
    print(f"     QWK (Quadratic Weighted Kappa): {overall_qwk:.4f}")
    print(f"     Macro-F1:                       {overall_macro_f1:.4f}")
    print(f"     Balanced Accuracy:              {overall_balanced_acc:.4f}")

    # Classification report
    print(f"\n  Classification Report:")
    class_report = classification_report(y, oof_predictions, zero_division=0)
    print(class_report)
    class_report_dict = classification_report(y, oof_predictions,
                                              output_dict=True, zero_division=0)

    # Confusion matrix
    cm = confusion_matrix(y, oof_predictions)
    print(f"\n  Confusion Matrix:")
    print(cm)

    # Plot confusion matrix
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
               xticklabels=range(1, 6), yticklabels=range(1, 6))
    plt.title('Model B: Confusion Matrix')
    plt.ylabel('True Class')
    plt.xlabel('Predicted Class')
    plt.tight_layout()
    cm_plot_path = Config.PLOTS_DIR / 'model_b_confusion_matrix.png'
    plt.savefig(cm_plot_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"\n  ✓ Confusion matrix plot saved: {cm_plot_path.name}")

    # Train final model on all data
    print(f"\n  Training final model on full dataset with SMOTE...")
    pipeline.fit(X_np, y_np)

    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': Config.FEATURES,
        'importance': pipeline.named_steps['classifier'].feature_importances_
    }).sort_values('importance', ascending=False)

    # Plot feature importance
    plt.figure(figsize=(10, 8))
    top_features = feature_importance.head(15)
    plt.barh(range(len(top_features)), top_features['importance'])
    plt.yticks(range(len(top_features)), top_features['feature'])
    plt.xlabel('Importance (Gain)')
    plt.title('Model B: Feature Importance')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    importance_plot_path = Config.PLOTS_DIR / 'model_b_feature_importance.png'
    plt.savefig(importance_plot_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  ✓ Feature importance plot saved: {importance_plot_path.name}")

    results = {
        'model': pipeline,
        'oof_predictions': oof_predictions,
        'oof_probabilities': oof_probabilities,
        'cv_metrics': cv_metrics,
        'overall_metrics': {
            'qwk': float(overall_qwk),
            'macro_f1': float(overall_macro_f1),
            'balanced_accuracy': float(overall_balanced_acc)
        },
        'classification_report': class_report_dict,
        'confusion_matrix': cm.tolist(),
        'feature_importance': feature_importance
    }

    return results

# ============================================================================
# MAIN TRAINING PIPELINE
# ============================================================================
def main():
    """Main training pipeline"""
    print_header("🎯 SEISMIC RISK ASSESSMENT - MODEL TRAINING")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Random seed: {SEED}")

    # Load data
    print_section("1. LOADING DATA")
    print(f"Data file: {Config.DATA_FILE}")

    if not Config.DATA_FILE.exists():
        print(f"❌ ERROR: Data file not found!")
        print(f"   Please place training data at: {Config.DATA_FILE}")
        print(f"   Expected columns: {Config.FEATURES + [Config.TARGET_REGRESSION, Config.TARGET_CLASSIFICATION]}")
        return

    df = pd.read_csv(Config.DATA_FILE)
    print(f"✓ Loaded {len(df)} neighborhoods, {len(df.columns)} columns")

    # Prepare features and targets
    X = df[Config.FEATURES].copy()
    y_reg = df[Config.TARGET_REGRESSION].copy()
    y_clf = df[Config.TARGET_CLASSIFICATION].copy().astype(int)

    print(f"\nFeatures: {len(Config.FEATURES)}")
    print(f"Target (regression): {Config.TARGET_REGRESSION}")
    print(f"Target (classification): {Config.TARGET_CLASSIFICATION}")

    # Train Model A
    print_section("2. TRAINING MODEL A (REGRESSION)")
    model_a_results = train_model_a(X, y_reg)

    # Save Model A
    model_a_path = Config.MODEL_DIR / 'model_a_regression.pkl'
    joblib.dump(model_a_results['model'], model_a_path)
    print(f"\n  ✓ Model A saved: {model_a_path}")

    # Train Model B
    print_section("3. TRAINING MODEL B (CLASSIFICATION)")
    model_b_results = train_model_b(X, y_clf)

    # Save Model B
    model_b_path = Config.MODEL_DIR / 'model_b_classification.pkl'
    joblib.dump(model_b_results['model'], model_b_path)
    print(f"\n  ✓ Model B saved: {model_b_path}")

    # Save artifacts
    print_section("4. SAVING ARTIFACTS")

    # Feature importance
    feature_importance_combined = pd.DataFrame({
        'feature': Config.FEATURES,
        'model_a_importance': model_a_results['feature_importance'].set_index('feature').loc[Config.FEATURES, 'importance'].values,
        'model_a_shap': model_a_results['feature_importance'].set_index('feature').loc[Config.FEATURES, 'shap_importance'].values,
        'model_b_importance': model_b_results['feature_importance'].set_index('feature').loc[Config.FEATURES, 'importance'].values
    }).sort_values('model_a_importance', ascending=False)

    feature_importance_path = Config.ARTIFACTS_DIR / 'feature_importance.csv'
    feature_importance_combined.to_csv(feature_importance_path, index=False)
    print(f"  ✓ Feature importance: {feature_importance_path.name}")

    # Predictions
    predictions_df = pd.DataFrame({
        'mah_id': df['mah_id'] if 'mah_id' in df.columns else range(len(df)),
        'mahalle_adi': df['mahalle_adi'] if 'mahalle_adi' in df.columns else [''] * len(df),
        'y_true_regression': y_reg,
        'y_pred_regression': model_a_results['oof_predictions'],
        'y_true_classification': y_clf,
        'y_pred_classification': model_b_results['oof_predictions'],
        'prob_class_1': model_b_results['oof_probabilities'][:, 0],
        'prob_class_2': model_b_results['oof_probabilities'][:, 1],
        'prob_class_3': model_b_results['oof_probabilities'][:, 2],
        'prob_class_4': model_b_results['oof_probabilities'][:, 3],
        'prob_class_5': model_b_results['oof_probabilities'][:, 4],
    })

    predictions_path = Config.ARTIFACTS_DIR / 'predictions.csv'
    predictions_df.to_csv(predictions_path, index=False)
    print(f"  ✓ Predictions: {predictions_path.name}")

    # Results JSON
    results = {
        'timestamp': datetime.now().isoformat(),
        'dataset': {
            'total_neighborhoods': len(df),
            'n_features': len(Config.FEATURES),
            'features': Config.FEATURES
        },
        'model_a': {
            'type': 'LightGBM Regression',
            'target': Config.TARGET_REGRESSION,
            'cv_folds': Config.CV_FOLDS,
            'metrics': model_a_results['overall_metrics'],
            'cv_metrics': model_a_results['cv_metrics']
        },
        'model_b': {
            'type': 'LightGBM Classification with SMOTE',
            'target': Config.TARGET_CLASSIFICATION,
            'cv_folds': Config.CV_FOLDS,
            'class_weights': {str(k): v for k, v in Config.CLASS_WEIGHTS.items()},
            'metrics': model_b_results['overall_metrics'],
            'cv_metrics': model_b_results['cv_metrics'],
            'classification_report': model_b_results['classification_report'],
            'confusion_matrix': model_b_results['confusion_matrix']
        }
    }

    results_path = Config.ARTIFACTS_DIR / 'training_results.json'
    save_json(results, results_path)

    # Summary
    print_header("✅ TRAINING COMPLETE", char='=')
    print(f"\n📊 MODEL A (REGRESSION) RESULTS:")
    print(f"   RMSE:     {model_a_results['overall_metrics']['rmse']:.6f}")
    print(f"   MAE:      {model_a_results['overall_metrics']['mae']:.6f}")
    print(f"   Spearman: {model_a_results['overall_metrics']['spearman']:.4f}")

    print(f"\n📊 MODEL B (CLASSIFICATION) RESULTS:")
    print(f"   QWK:              {model_b_results['overall_metrics']['qwk']:.4f}")
    print(f"   Macro-F1:         {model_b_results['overall_metrics']['macro_f1']:.4f}")
    print(f"   Balanced Accuracy: {model_b_results['overall_metrics']['balanced_accuracy']:.4f}")

    print(f"\n📁 OUTPUT FILES:")
    print(f"   Models:")
    print(f"   - {model_a_path}")
    print(f"   - {model_b_path}")
    print(f"\n   Artifacts:")
    print(f"   - {feature_importance_path}")
    print(f"   - {predictions_path}")
    print(f"   - {results_path}")
    print(f"\n   Plots:")
    print(f"   - {Config.PLOTS_DIR / 'model_a_shap_summary.png'}")
    print(f"   - {Config.PLOTS_DIR / 'model_a_feature_importance.png'}")
    print(f"   - {Config.PLOTS_DIR / 'model_b_confusion_matrix.png'}")
    print(f"   - {Config.PLOTS_DIR / 'model_b_feature_importance.png'}")

    print(f"\n⏱️  End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 80}\n")

if __name__ == '__main__':
    main()
