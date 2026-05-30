import pytest
import os
import pandas as pd
from unittest.mock import patch, MagicMock
from utils.crop_recommender import predict_best_crop, get_recommender_model

@patch('utils.crop_recommender.joblib.load')
@patch('utils.crop_recommender.os.path.exists')
def test_predict_best_crop_success(mock_exists, mock_joblib_load, app):
    """Test that predict_best_crop constructs the Pandas features schema and triggers the predictor correctly"""
    mock_exists.return_value = True
    
    # Configure mock Random Forest model
    mock_model = MagicMock()
    mock_model.predict.return_value = ['rice']
    mock_joblib_load.return_value = mock_model
    
    with app.app_context():
        # Reset the global variable to force lazy loading inside the test
        import utils.crop_recommender
        utils.crop_recommender._RECOMMENDER_MODEL = None
        
        crop = predict_best_crop(
            n=90, p=42, k=43,
            temperature=28.0, humidity=60.0, ph=6.5, rainfall=120.0
        )
        
        assert crop == 'rice'
        mock_model.predict.assert_called_once()
        
        # Verify structure of pandas dataframe sent to sklearn model
        df = mock_model.predict.call_args[0][0]
        assert isinstance(df, pd.DataFrame)
        assert df.shape == (1, 7)
        assert list(df.columns) == ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        assert df.iloc[0]['N'] == 90.0
        assert df.iloc[0]['P'] == 42.0
        assert df.iloc[0]['ph'] == 6.5

@patch('utils.crop_recommender.os.path.exists')
def test_predict_best_crop_file_not_found(mock_exists, app):
    """Test that get_recommender_model throws FileNotFoundError if the pickle file is missing"""
    mock_exists.return_value = False
    
    with app.app_context():
        import utils.crop_recommender
        utils.crop_recommender._RECOMMENDER_MODEL = None
        
        with pytest.raises(FileNotFoundError):
            get_recommender_model()
            
        # Verify predict_best_crop handles error gracefully and returns None
        crop = predict_best_crop(90, 42, 43, 28, 60, 6.5, 120)
        assert crop is None
