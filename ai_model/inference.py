"""
Inference Script for Audio Classification Model

This script demonstrates how to use a trained audio classification model
to predict whether an audio file contains a bark or not.
"""

import torch
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import soundfile as sf
import librosa
import os


def load_model(model_path="./final_bark_model"):
    """
    Load the trained model and feature extractor
    """
    print(f"Loading model from {model_path}...")

    # Load the model
    model = AutoModelForAudioClassification.from_pretrained(model_path)

    # Load the feature extractor from the original pre-trained model
    # since the checkpoint might not have preprocessor_config.json
    feature_extractor = AutoFeatureExtractor.from_pretrained("facebook/wav2vec2-base")

    # Set model to evaluation mode
    model.eval()

    return model, feature_extractor


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
        print(f"Error loading audio file {audio_path}: {e}")
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


def predict_audio(model, feature_extractor, audio_path):
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
        predicted_class = torch.argmax(logits, dim=-1).item()
        confidence = probabilities[0][predicted_class].item()

    # Map class index to label
    class_labels = ["no_bark", "bark"]
    predicted_label = class_labels[predicted_class]

    return {
        "prediction": predicted_label,
        "confidence": confidence,
        "probabilities": {
            "no_bark": probabilities[0][0].item(),
            "bark": probabilities[0][1].item(),
        },
    }


def main():
    """
    Example usage of the trained model
    """
    print("=== Audio Classification Inference ===")

    # Load the trained model
    try:
        model, feature_extractor = load_model()
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print(
            "Make sure you have trained the model first using simple_audio_training.py"
        )
        return

    # Example: predict on a test audio file
    # You can replace this with your own audio file
    test_audio_path = "Dog-barking-very-loudly.wav"  # Using the file in your workspace

    if not os.path.exists(test_audio_path):
        print(f"Test audio file {test_audio_path} not found.")
        print("Please provide a path to an audio file for testing.")
        return

    print(f"Predicting on audio file: {test_audio_path}")

    # Make prediction
    result = predict_audio(model, feature_extractor, test_audio_path)

    # Display results
    print(f"\nPrediction Results:")
    print(f"Predicted class: {result['prediction']}")
    print(f"Confidence: {result['confidence']:.3f}")
    print(f"Probabilities:")
    print(f"  No bark: {result['probabilities']['no_bark']:.3f}")
    print(f"  Bark: {result['probabilities']['bark']:.3f}")


if __name__ == "__main__":
    main()
