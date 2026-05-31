import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from config import config
from utils.database import init_database
from utils.ml_pipeline import check_models_available
from utils.ml_startup_check import verify_ml_pipeline_startup
from utils.logging_config import configure_logging, suppress_sklearn_warnings
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.history import history_bp
from routes.scan import scan_bp
from routes.chat import chat_bp
from routes.community import community_bp
from routes.planner import planner_bp
from routes.wholesale import wholesale_bp
from routes.weather import weather_bp
import logging
import os

# Configure logging BEFORE any other imports that might create loggers
configure_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)
    
    # Setup logging
    app_logger = logging.getLogger(__name__)
    
    # Suppress scikit-learn version warnings before loading models
    suppress_sklearn_warnings()
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Disable debug mode in production to avoid auto-reload spam
    if config_name == 'production':
        app.config['DEBUG'] = False
    
    # Enable CORS
    CORS(app)
    
    # Initialize database
    init_database()
    
    # Initialize and verify ML models
    ml_success, ml_report = verify_ml_pipeline_startup(app.root_path)
    if not ml_success:
        app_logger.warning("⚠️  ML Models not fully available - running in degraded mode")
    
    # Store ML status in app context
    app.ml_status = ml_report
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(scan_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(community_bp)
    app.register_blueprint(planner_bp)
    app.register_blueprint(wholesale_bp)
    app.register_blueprint(weather_bp)
    
    # ====== ROUTES ======
    @app.route('/', methods=['GET'])
    def home():
        return jsonify({
            'status': 'success',
            'message': 'AgroSense Backend API',
            'version': '1.0.0',
            'environment': os.getenv('FLASK_ENV', 'development'),
            'endpoints': {
                'health': '/health',
                'auth': '/api/v1/auth',
                'dashboard': '/api/v1/dashboard',
                'history': '/api/v1/history'
            }
        }), 200
    
    @app.route('/health', methods=['GET'])
    def health():
        """Comprehensive health check including ML models status"""
        import datetime
        
        # Check ML models availability
        ml_status = check_models_available(app.root_path)
        
        # Determine overall health
        all_models_ready = all(status['loaded'] for status in ml_status.values())
        
        health_data = {
            'status': 'healthy' if all_models_ready else 'degraded',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'service': 'AgroSense Backend',
            'environment': os.getenv('FLASK_ENV', 'development'),
            'models': ml_status
        }
        
        http_status = 200 if all_models_ready else 503
        return jsonify(health_data), http_status
    
    @app.route('/diagnostics/ml', methods=['GET'])
    def ml_diagnostics():
        """Detailed ML pipeline diagnostics endpoint"""
        import datetime
        from utils.ml_pipeline import verify_model_exists, get_model_path, MODEL_CONFIG
        
        diagnostics = {
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'app_root': app.root_path,
            'models': {}
        }
        
        try:
            # Check each model
            for model_name, config in MODEL_CONFIG.items():
                model_info = {
                    'name': model_name,
                    'type': config['type'],
                    'description': config['description'],
                    'filename': config['filename']
                }
                
                # Check if file exists
                try:
                    model_path = get_model_path(model_name, app.root_path)
                    exists = model_path.exists()
                    model_info['exists'] = exists
                    
                    if exists:
                        model_info['path'] = str(model_path)
                        model_info['size_mb'] = round(model_path.stat().st_size / (1024*1024), 2)
                        
                        # Try to load the model
                        if model_name == 'crop_recommender':
                            from utils.ml_pipeline import load_crop_recommender
                            model = load_crop_recommender(app.root_path)
                            if model:
                                model_info['loaded'] = True
                                model_info['model_type'] = type(model).__name__
                            else:
                                model_info['loaded'] = False
                                model_info['error'] = 'Model returned None'
                    else:
                        model_info['path'] = str(model_path)
                        model_info['loaded'] = False
                        model_info['error'] = 'File not found'
                        
                except Exception as e:
                    model_info['error'] = str(e)
                    model_info['loaded'] = False
                
                diagnostics['models'][model_name] = model_info
        
        except Exception as e:
            logger.error(f"Diagnostics error: {e}", exc_info=True)
            diagnostics['error'] = str(e)
        
        return jsonify(diagnostics), 200
        
        return jsonify(diagnostics), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'status': 'error',
            'message': 'Route not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500
    
    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    
    print("Server Started!")
    
    # Note: debug=False disables the reloader which prevents Flask from
    # restarting when TensorFlow/scikit-learn files change.
    # Set FLASK_ENV=development to enable debug mode for development.
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,  # Disabled to prevent auto-reload spam from TensorFlow
        use_reloader=False  # Disable file watcher to prevent restart loops
    )
