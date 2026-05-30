"""
Logging Configuration for ArgoFarm Backend
Provides clean, production-ready logging with proper verbosity levels
"""
import logging
import os
import sys


def configure_logging(app=None):
    """
    Configure logging for the application.
    Reduces verbosity of external libraries and provides clean output.
    """
    
    # Suppress verbose TensorFlow logging
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Only show errors
    
    # Suppress TensorFlow INFO and WARNING messages
    import tensorflow as tf
    tf.get_logger().setLevel(logging.ERROR)
    
    # Suppress oneDNN logging
    os.environ['DNNL_VERBOSE'] = '0'
    
    # Suppress absl logging
    logging.getLogger('absl').setLevel(logging.ERROR)
    
    # Suppress TensorFlow ops logging
    logging.getLogger('tensorflow.ops').setLevel(logging.ERROR)
    
    # Suppress matplotlib logging if used
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set specific loggers
    logger_config = {
        'werkzeug': logging.WARNING,  # Reduce Flask/werkzeug verbosity
        'urllib3': logging.WARNING,
        'requests': logging.WARNING,
        'sklearn': logging.WARNING,  # Suppress scikit-learn warnings
        'sklearn.utils': logging.ERROR,
        'pandas': logging.WARNING,
        'joblib': logging.INFO,
        'utils.ml_pipeline': logging.INFO,
        'utils.ml_startup_check': logging.INFO,
        'routes': logging.INFO,
        'models': logging.INFO,
        'app': logging.INFO,
    }
    
    for logger_name, level in logger_config.items():
        logging.getLogger(logger_name).setLevel(level)
    
    # Disable Flask's default logger in debug mode to reduce reloader spam
    if app:
        app.logger.setLevel(logging.INFO)
        
        # Remove duplicate log handlers
        if app.logger.hasHandlers():
            for handler in app.logger.handlers[:]:
                app.logger.removeHandler(handler)
        
        # Add our configured handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        app.logger.addHandler(handler)
    
    return logging.getLogger(__name__)


def suppress_sklearn_warnings():
    """
    Suppress scikit-learn version warnings when loading pickled models.
    Call this before loading sklearn models.
    """
    import warnings
    warnings.filterwarnings('ignore', category=Warning, module='sklearn')
    
    # Specifically suppress the InconsistentVersionWarning
    try:
        from sklearn.utils._set_output import _get_output_config
        warnings.filterwarnings(
            'ignore',
            message='.*Trying to unpickle estimator.*',
            category=Warning
        )
    except ImportError:
        pass


def get_clean_logger(name):
    """Get a logger with clean configuration"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    return logger
