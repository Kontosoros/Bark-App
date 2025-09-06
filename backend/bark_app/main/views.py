from rest_framework import generics, status

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User


from .serializers import UserSerializer, RegisterSerializer
import os
import tempfile
import soundfile as sf
import librosa
import numpy as np
import torch
from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
from datetime import datetime
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Global variables for model loading
MODEL = None
FEATURE_EXTRACTOR = None


# Create your views here.
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


def load_model(model_path=None):
    """
    Load the trained model and feature extractor
    """
    global MODEL, FEATURE_EXTRACTOR

    if MODEL is None or FEATURE_EXTRACTOR is None:
        try:
            # Use Django settings for model path
            if model_path is None:
                model_path = settings.AI_MODEL_ROOT

            logger.info(f"Loading model from {model_path}...")

            # Check if model directory exists
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model directory not found: {model_path}")

            # Load the model from local path
            MODEL = AutoModelForAudioClassification.from_pretrained(
                model_path, local_files_only=True
            )

            # Load the feature extractor from the original pre-trained model
            FEATURE_EXTRACTOR = AutoFeatureExtractor.from_pretrained(
                "facebook/wav2vec2-base"
            )

            # Set model to evaluation mode
            MODEL.eval()

            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise e

    return MODEL, FEATURE_EXTRACTOR


def load_audio_file(audio_path, target_sampling_rate=16000):
    """
    Load audio file using soundfile and librosa
    """
    try:
        # Load audio using soundfile
        audio_array, sampling_rate = sf.read(audio_path)

        # Convert to mono if stereo
        if len(audio_array.shape) > 1:
            audio_array = audio_array.mean(axis=1)

        # Resample if needed
        if sampling_rate != target_sampling_rate:
            audio_array = librosa.resample(
                audio_array, orig_sr=sampling_rate, target_sr=target_sampling_rate
            )

        return audio_array, target_sampling_rate
    except Exception as e:
        logger.error(f"Error loading audio file {audio_path}: {e}")
        # Return silence if loading fails
        return np.zeros(target_sampling_rate), target_sampling_rate


def preprocess_audio(audio_path, feature_extractor, target_sampling_rate=16000):
    """
    Preprocess a single audio file for inference
    """
    # Load and resample audio
    audio_array, sr = load_audio_file(audio_path, target_sampling_rate)

    # Extract features
    inputs = feature_extractor(
        audio_array,
        sampling_rate=target_sampling_rate,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=16000,
    )

    return inputs


def use_model(model, feature_extractor, audio_path):
    """
    Predict whether an audio file contains a bark
    """
    # Preprocess the audio
    inputs = preprocess_audio(audio_path, feature_extractor)

    # Make prediction
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=-1)
        predicted_class = int(torch.argmax(logits, dim=-1).item())
        confidence = probabilities[0][predicted_class].item()

    # Map class index to label
    class_labels = ["no_bark", "bark"]
    predicted_label = class_labels[predicted_class]

    return {
        "prediction": predicted_label,
        "confidence": confidence,
        "class": predicted_class,
        "probabilities": {
            "no_bark": probabilities[0][0].item(),
            "bark": probabilities[0][1].item(),
        },
    }


class AnalyzeAudioView(generics.GenericAPIView):
    """
    Class-based view for analyzing audio files for bark detection
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Analyze audio file for bark detection
        """
        print("🔍 Request FILES:", request.FILES)
        print("🔍 Request DATA:", request.data)

        try:
            # Check if file is provided
            if "file" not in request.FILES:
                return Response(
                    {"error": "No audio file provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            audio_file = request.FILES["file"]

            # Validate file type
            allowed_extensions = [".wav", ".mp3", ".m4a", ".flac"]
            file_extension = os.path.splitext(audio_file.name)[1].lower()

            if file_extension not in allowed_extensions:
                return Response(
                    {
                        "error": f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create temporary file
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=file_extension
            ) as tmp:
                temp_path = tmp.name
                for chunk in audio_file.chunks():
                    tmp.write(chunk)

            try:
                # Load model
                model, feature_extractor = load_model()

                # Make prediction
                result = use_model(model, feature_extractor, temp_path)

                # Prepare response
                response_data = {
                    "success": True,
                    "prediction": result["prediction"],
                    "confidence": result["confidence"],
                    "probabilities": result["probabilities"],
                    "timestamp": datetime.now().isoformat(),
                    "filename": audio_file.name,
                    "file_size": audio_file.size,
                }

                return Response(response_data, status=status.HTTP_200_OK)

            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        except Exception as e:
            logger.error(f"Error in analyze_audio: {e}")
            return Response(
                {"error": "Internal server error during audio analysis"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
