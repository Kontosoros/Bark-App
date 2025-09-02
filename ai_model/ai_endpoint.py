import os
import tempfile
import soundfile as sf
from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
import numpy as np
import torch

app = Flask(__name__)
CORS(app)
CORS(app, origins=["http://localhost:4200"])  # Allow your Angular app


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


MODEL, FEATURE_EXTRACTOR = load_model()


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
    print(inputs)
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


@app.route("/read-file", methods=["POST"])
def read_file():
    file = request.files["file"]

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        temp_path = tmp.name
        file.save(temp_path)  # save uploaded file to temp path

    try:
        result = predict_audio(MODEL, FEATURE_EXTRACTOR, temp_path)

        # Prepare response
        response = {
            "prediction": result["prediction"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
        }
    finally:
        # Always clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return jsonify(response), 200


if __name__ == "__main__":
    app.run(debug=True)
