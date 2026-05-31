#!/usr/bin/env python3
"""
ML Pipeline Verification Script
Tests the crop recommender model.
Run this script to verify models are working correctly before deployment.

Usage:
    python test_ml_pipeline.py
"""
import os
import sys
import numpy as np
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Import after path is set
from utils.ml_pipeline import (
    predict_crop,
    check_models_available,
    load_crop_recommender,
    verify_model_exists
)


def test_model_files_exist():
    """Test 1: Check if model files exist"""
    logger.info("\n" + "="*60)
    logger.info("TEST 1: Checking model file existence")
    logger.info("="*60)
    
    app_root = str(backend_path)
    models = {
        'crop_recommender': 'ai_models/crop_recommender_model.pkl',
    }
    
    all_exist = True
    for model_name, model_path in models.items():
        full_path = Path(app_root) / model_path
        exists = full_path.exists()
        status = "✅ FOUND" if exists else "❌ MISSING"
        logger.info(f"{model_name}: {status} at {full_path}")
        if not exists:
            all_exist = False
    
    return all_exist


def test_model_loading():
    """Test 2: Test model loading"""
    logger.info("\n" + "="*60)
    logger.info("TEST 2: Testing model loading")
    logger.info("="*60)
    
    app_root = str(backend_path)
    
    # Test crop recommender
    logger.info("\nLoading crop recommender model...")
    try:
        model = load_crop_recommender(app_root)
        if model:
            logger.info(f"✅ Crop recommender loaded successfully")
            logger.info(f"   Model type: {type(model).__name__}")
        else:
            logger.error("❌ Crop recommender returned None")
            return False
    except Exception as e:
        logger.error(f"❌ Error loading crop recommender: {e}")
        return False
    
    return True


def test_crop_prediction():
    """Test 3: Test crop prediction with sample data"""
    logger.info("\n" + "="*60)
    logger.info("TEST 3: Testing crop prediction")
    logger.info("="*60)
    
    app_root = str(backend_path)
    
    # Test with multiple sample inputs
    test_cases = [
        {
            'name': 'Wheat conditions',
            'n': 50, 'p': 20, 'k': 25, 'temperature': 28,
            'humidity': 65, 'ph': 7.0, 'rainfall': 600
        },
        {
            'name': 'Rice conditions',
            'n': 80, 'p': 40, 'k': 40, 'temperature': 25,
            'humidity': 75, 'ph': 6.5, 'rainfall': 1200
        },
        {
            'name': 'Corn conditions',
            'n': 60, 'p': 25, 'k': 30, 'temperature': 26,
            'humidity': 60, 'ph': 6.8, 'rainfall': 800
        }
    ]
    
    all_passed = True
    for test_case in test_cases:
        logger.info(f"\nTesting: {test_case['name']}")
        try:
            crop = predict_crop(
                n=test_case['n'],
                p=test_case['p'],
                k=test_case['k'],
                temperature=test_case['temperature'],
                humidity=test_case['humidity'],
                ph=test_case['ph'],
                rainfall=test_case['rainfall'],
                app_root_path=app_root
            )
            
            if crop:
                logger.info(f"✅ Prediction successful: {crop}")
            else:
                logger.error("❌ Prediction returned None")
                all_passed = False
        except Exception as e:
            logger.error(f"❌ Error during prediction: {e}")
            all_passed = False
    
    return all_passed


def test_health_check():
    """Test 4: Test health check endpoint"""
    logger.info("\n" + "="*60)
    logger.info("TEST 4: Testing health check")
    logger.info("="*60)
    
    app_root = str(backend_path)
    
    try:
        status = check_models_available(app_root)
        
        logger.info("\nModel Status Report:")
        logger.info("-" * 40)
        
        all_ready = True
        for model_name, model_status in status.items():
            exists = model_status.get('exists', False)
            loaded = model_status.get('loaded', False)
            description = model_status.get('description', 'Unknown')
            
            exists_str = "✅" if exists else "❌"
            loaded_str = "✅" if loaded else "❌"
            
            logger.info(f"\n{model_name}:")
            logger.info(f"  Description: {description}")
            logger.info(f"  File exists: {exists_str}")
            logger.info(f"  Loaded: {loaded_str}")
            
            if not (exists and loaded):
                all_ready = False
        
        logger.info("\n" + "-" * 40)
        if all_ready:
            logger.info("✅ All models ready")
        else:
            logger.info("⚠️  Some models are not ready")
        
        return all_ready
    except Exception as e:
        logger.error(f"❌ Error during health check: {e}")
        return False


def main():
    """Run all tests"""
    logger.info("\n" + "="*60)
    logger.info("ML PIPELINE VERIFICATION SUITE")
    logger.info("="*60)
    
    results = {
        'Model files exist': test_model_files_exist(),
        'Model loading': test_model_loading(),
        'Crop prediction': test_crop_prediction(),
        'Health check': test_health_check(),
    }
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("TEST SUMMARY")
    logger.info("="*60)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    logger.info("\n" + "="*60)
    if all_passed:
        logger.info("✅ ALL TESTS PASSED - Pipeline is ready for production")
    else:
        logger.info("❌ SOME TESTS FAILED - See details above")
    logger.info("="*60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
