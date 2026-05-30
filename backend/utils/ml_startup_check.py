"""
Production ML Pipeline Startup Verification
Runs when Flask app starts to ensure the crop recommendation ML model is ready.
TensorFlow plant disease detector CNN has been migrated to Groq Vision.
"""
import logging
import os
from pathlib import Path
import warnings

# Suppress all warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


def verify_ml_pipeline_startup(app_root_path):
    """
    Verify ML pipeline is ready for production.
    Called during Flask app initialization.
    
    Returns:
        tuple: (success: bool, status_report: dict)
    """
    report = {
        'timestamp': __import__('datetime').datetime.utcnow().isoformat(),
        'environment': os.getenv('FLASK_ENV', 'development'),
        'models': {},
        'warnings': [],
        'errors': []
    }
    
    try:
        from utils.ml_pipeline import (
            verify_model_exists,
            load_crop_recommender
        )
        
        # Suppress warnings during loading
        import warnings
        warnings.filterwarnings('ignore', category=Warning)
        
        logger.info("=" * 70)
        logger.info("ML PIPELINE VERIFICATION")
        logger.info("=" * 70)
        
        # Check crop recommender
        logger.info("\n[CROP RECOMMENDER]")
        
        if verify_model_exists('crop_recommender', app_root_path):
            logger.info("  File: EXISTS")
            try:
                model = load_crop_recommender(app_root_path)
                if model:
                    logger.info(f"  Status: READY ({type(model).__name__})")
                    report['models']['crop_recommender'] = {
                        'status': 'ready',
                        'type': type(model).__name__
                    }
                else:
                    raise Exception("Model loading returned None")
            except Exception as e:
                logger.error(f"  Status: FAILED")
                report['models']['crop_recommender'] = {
                    'status': 'error',
                    'error': str(e)
                }
                report['errors'].append(f"Crop recommender: {str(e)}")
        else:
            logger.error("  File: NOT FOUND")
            report['models']['crop_recommender'] = {
                'status': 'missing',
                'error': 'Model file not found'
            }
            report['errors'].append("Crop recommender model file missing")
        
        # Summary
        logger.info("\n" + "=" * 70)
        logger.info("RESULT")
        logger.info("=" * 70)
        
        crop_ready = report['models'].get('crop_recommender', {}).get('status') == 'ready'
        
        if crop_ready:
            logger.info("STATUS: CROP RECOMMENDER READY")
            success = True
        else:
            logger.error("STATUS: FAILURE - Crop recommender model not available")
            success = False
        
        if report['errors']:
            logger.error(f"\nERRORS ({len(report['errors'])}):")
            for e in report['errors']:
                logger.error(f"  - {e}")
        
        logger.info("=" * 70 + "\n")
        
        return success, report
        
    except Exception as e:
        logger.exception("ML Pipeline verification failed")
        report['errors'].append(f"Verification exception: {str(e)}")
        return False, report
