import logging
from flask import current_app
from utils.ml_pipeline import predict_crop as predict_crop_pipeline

logger = logging.getLogger(__name__)

def get_recommender_model():
    """
    Deprecated: Use ml_pipeline.load_crop_recommender instead.
    Maintained for backward compatibility.
    """
    from utils.ml_pipeline import load_crop_recommender
    return load_crop_recommender(current_app.root_path)

def predict_best_crop(n, p, k, temperature, humidity, ph, rainfall):
    """
    Run prediction on the Random Forest crop recommender.
    
    Delegates to ml_pipeline.predict_crop for centralized error handling.
    
    Args:
        n (float): Nitrogen
        p (float): Phosphorus
        k (float): Potassium
        temperature (float): Temperature in Celsius
        humidity (float): Relative humidity %
        ph (float): Soil pH level
        rainfall (float): Rainfall in mm
        
    Returns:
        str: Recommended crop name (e.g. 'rice', 'wheat', 'maize', etc.) or None if prediction fails
    """
    return predict_crop_pipeline(n, p, k, temperature, humidity, ph, rainfall, current_app.root_path)
        
    return None
