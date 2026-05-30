"""
ML Pipeline Module
Handles the crop_recommender model loading, caching, and predictions with proper error handling.
TensorFlow plant disease detector CNN has been migrated to Groq Vision.
"""
import os
import joblib
import logging
import warnings
import pandas as pd
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Suppress sklearn version warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', message='.*Trying to unpickle estimator.*')

# Global model cache
_MODELS_CACHE = {
    'crop_recommender': None
}

# Model metadata
MODEL_CONFIG = {
    'crop_recommender': {
        'filename': 'crop_recommender_model.pkl',
        'type': 'sklearn',
        'description': 'Random Forest crop recommendation model'
    }
}

def get_model_path(model_name: str, app_root_path: str) -> Path:
    """Get the absolute path to the crop_recommender model file."""
    if model_name not in MODEL_CONFIG:
        raise ValueError(f"Unknown model: {model_name}")
    
    filename = MODEL_CONFIG[model_name]['filename']
    model_path = Path(app_root_path) / 'ai_models' / filename
    return model_path


def verify_model_exists(model_name: str, app_root_path: str) -> bool:
    """Check if a model file exists."""
    try:
        model_path = get_model_path(model_name, app_root_path)
        exists = model_path.exists()
        if not exists:
            logger.warning(f"Model file not found: {model_path}")
        return exists
    except Exception as e:
        logger.error(f"Error checking model existence: {e}")
        return False


def load_crop_recommender(app_root_path: str) -> Optional[object]:
    """
    Load the crop recommender Random Forest model.
    
    Args:
        app_root_path: Flask app root path
        
    Returns:
        Loaded model or None if failed
    """
    try:
        if _MODELS_CACHE['crop_recommender'] is not None:
            logger.debug("Using cached crop recommender model")
            return _MODELS_CACHE['crop_recommender']
        
        model_path = get_model_path('crop_recommender', app_root_path)
        
        if not model_path.exists():
            logger.error(f"Crop recommender model not found at: {model_path}")
            return None
        
        logger.info(f"Loading crop recommender model from: {model_path}")
        
        # Suppress scikit-learn version warnings
        import warnings
        warnings.filterwarnings('ignore', category=Warning)
        
        model = joblib.load(str(model_path))
        _MODELS_CACHE['crop_recommender'] = model
        logger.info("✅ Successfully loaded crop recommender model")
        return model
        
    except Exception as e:
        logger.error(f"Error loading crop recommender model: {e}", exc_info=True)
        return None


def predict_crop(n: float, p: float, k: float, temperature: float, 
                 humidity: float, ph: float, rainfall: float,
                 app_root_path: str) -> Optional[str]:
    """
    Predict the best crop using the Random Forest model.
    
    Args:
        n: Nitrogen content
        p: Phosphorus content
        k: Potassium content
        temperature: Temperature in Celsius
        humidity: Relative humidity %
        ph: Soil pH level
        rainfall: Rainfall in mm
        app_root_path: Flask app root path
        
    Returns:
        Predicted crop name or None if prediction fails
    """
    try:
        model = load_crop_recommender(app_root_path)
        if model is None:
            logger.error("Crop recommender model not loaded")
            return None
        
        # Create features DataFrame with correct column order
        features = pd.DataFrame([[
            float(n),
            float(p),
            float(k),
            float(temperature),
            float(humidity),
            float(ph),
            float(rainfall)
        ]], columns=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
        
        predictions = model.predict(features)
        
        if len(predictions) > 0:
            crop = str(predictions[0]).strip().lower()
            logger.info(f"Crop prediction: {crop} (N={n}, P={p}, K={k}, pH={ph})")
            return crop
        else:
            logger.warning("No predictions returned from model")
            return None
            
    except Exception as e:
        logger.error(f"Error during crop prediction: {e}", exc_info=True)
        return None


def check_models_available(app_root_path: str) -> dict:
    """
    Check availability of the crop recommender model (for health check endpoint).
    
    Args:
        app_root_path: Flask app root path
        
    Returns:
        Dictionary with model availability status
    """
    status = {}
    
    for model_name in MODEL_CONFIG.keys():
        exists = verify_model_exists(model_name, app_root_path)
        can_load = False
        
        try:
            if model_name == 'crop_recommender':
                model = load_crop_recommender(app_root_path)
                can_load = model is not None
        except Exception as e:
            logger.error(f"Error loading {model_name}: {e}")
            can_load = False
        
        status[model_name] = {
            'exists': exists,
            'loaded': can_load,
            'description': MODEL_CONFIG[model_name]['description']
        }
    
    return status


def clear_cache():
    """Clear the model cache."""
    global _MODELS_CACHE
    _MODELS_CACHE = {
        'crop_recommender': None
    }
    logger.info("Model cache cleared")
