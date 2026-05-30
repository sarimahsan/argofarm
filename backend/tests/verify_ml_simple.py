#!/usr/bin/env python3
"""
Simple ML Pipeline Verification
Tests the ML models directly without Flask context.
"""
import os
import sys
from pathlib import Path

backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

print("Testing ML Pipeline...")
print("=" * 60)

# Test 1: Check model files exist
print("\n1. Checking model files...")
ai_models_dir = backend_path / 'ai_models'
crop_model_path = ai_models_dir / 'crop_recommender_model.pkl'
disease_model_path = ai_models_dir / 'plant_disease_final_model.h5'

print(f"   Crop model: {crop_model_path}")
print(f"   - Exists: {crop_model_path.exists()}")
print(f"   - Size: {crop_model_path.stat().st_size if crop_model_path.exists() else 'N/A'} bytes")

print(f"\n   Disease model: {disease_model_path}")
print(f"   - Exists: {disease_model_path.exists()}")
print(f"   - Size: {disease_model_path.stat().st_size if disease_model_path.exists() else 'N/A'} bytes")

# Test 2: Try loading crop recommender
print("\n2. Loading crop recommender...")
try:
    import joblib
    model = joblib.load(str(crop_model_path))
    print(f"   ✅ Loaded successfully")
    print(f"   - Type: {type(model)}")
    print(f"   - Classes: {getattr(model, 'classes_', 'N/A')}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Try crop prediction
print("\n3. Testing crop prediction...")
try:
    import pandas as pd
    import joblib
    
    model = joblib.load(str(crop_model_path))
    
    # Create test input
    features = pd.DataFrame([[
        50, 20, 25,  # N, P, K
        28, 65, 7.0, 120  # temp, humidity, pH, rainfall
    ]], columns=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
    
    prediction = model.predict(features)
    print(f"   ✅ Prediction: {prediction[0]}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Try loading disease model
print("\n4. Loading disease detector...")
try:
    from tensorflow.keras.models import load_model
    model = load_model(str(disease_model_path))
    print(f"   ✅ Loaded successfully")
    print(f"   - Type: {type(model)}")
    print(f"   - Input shape: {model.input_shape}")
    print(f"   - Output shape: {model.output_shape}")
except ImportError as e:
    print(f"   ⚠️  TensorFlow not available: {e}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Try disease prediction
print("\n5. Testing disease prediction...")
try:
    from tensorflow.keras.models import load_model
    import numpy as np
    
    model = load_model(str(disease_model_path))
    
    # Create test image (random 224x224x3)
    test_image = np.random.rand(1, 224, 224, 3).astype('float32')
    
    predictions = model.predict(test_image, verbose=0)
    print(f"   ✅ Prediction shape: {predictions.shape}")
    
    # Get predicted class
    class_map = ['Healthy', 'Yellow Rust', 'Bacterial Leaf Blight', 
                 'Early Leaf Curl Symptoms', 'Northern Corn Leaf Blight', 
                 'Rice Blast', 'Other']
    top_idx = np.argmax(predictions[0])
    confidence = np.max(predictions[0]) * 100
    disease = class_map[top_idx] if top_idx < len(class_map) else 'Other'
    
    print(f"   - Disease: {disease}")
    print(f"   - Confidence: {confidence:.2f}%")
    
except ImportError as e:
    print(f"   ⚠️  TensorFlow not available: {e}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("✅ ML Pipeline verification complete!")
