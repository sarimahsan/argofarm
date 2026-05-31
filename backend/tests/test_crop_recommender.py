import pytest
from unittest.mock import patch, MagicMock
from utils.crop_recommender import predict_best_crop, get_recommender_model

@patch('utils.crop_recommender.predict_crop_pipeline')
def test_predict_best_crop_success(mock_predict_crop, app):
    """Test that predict_best_crop correctly delegates to ml_pipeline.predict_crop"""
    mock_predict_crop.return_value = 'rice'
    
    with app.app_context():
        crop = predict_best_crop(
            n=90, p=42, k=43,
            temperature=28.0, humidity=60.0, ph=6.5, rainfall=120.0
        )
        
        assert crop == 'rice'
        mock_predict_crop.assert_called_once_with(
            90, 42, 43, 28.0, 60.0, 6.5, 120.0, app.root_path
        )

@patch('utils.ml_pipeline.load_crop_recommender')
def test_get_recommender_model_success(mock_load, app):
    """Test that get_recommender_model correctly delegates to ml_pipeline.load_crop_recommender"""
    mock_model = MagicMock()
    mock_load.return_value = mock_model
    
    with app.app_context():
        model = get_recommender_model()
        assert model == mock_model
        mock_load.assert_called_once_with(app.root_path)
