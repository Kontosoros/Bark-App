"""
Comprehensive Guide: Training Audio Classification Models

This script demonstrates how to train an audio classification model using the Hugging Face Transformers library.
We'll use the bark detection dataset as an example.

Key Steps:
1. Data Loading and Preprocessing
2. Feature Extraction
3. Model Setup
4. Training Configuration
5. Training and Evaluation
"""

import os
import numpy as np
from datasets import load_dataset, Audio
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
    TrainingArguments,
    Trainer,
)
import evaluate
import soundfile as sf
import pandas as pd

# Set up logging and reproducibility
import logging

logging.basicConfig(level=logging.INFO)
import torch

torch.manual_seed(42)

# Fix for Windows multiprocessing
import multiprocessing

if __name__ == "__main__":
    multiprocessing.freeze_support()


def load_and_preprocess_audio_data():
    """
    Step 1: Load and preprocess audio data
    """
    print("Loading audio dataset...")

    # Load the bark detection dataset
    dataset = load_dataset(
        "rmarcosg/bark-detection", split="train", cache_dir="dogs_sounds"
    )

    print(f"Dataset loaded: {len(dataset)} samples")
    print(f"Dataset features: {dataset.features}")

    # Cast audio column to proper format with resampling
    # Use decode=False to avoid torchcodec issues
    dataset = dataset.cast_column("audio", Audio(sampling_rate=16000, decode=False))

    return dataset


def setup_feature_extractor():
    """
    Step 2: Set up feature extractor for audio processing
    """
    print("Setting up feature extractor...")

    # Use Wav2Vec2 feature extractor (good for speech/audio classification)
    feature_extractor = AutoFeatureExtractor.from_pretrained("facebook/wav2vec2-base")

    return feature_extractor


def load_audio_file(audio_path, target_sampling_rate=16000):
    """
    Load audio file manually to avoid torchcodec issues
    """
    try:
        # Load audio using soundfile
        audio_array, sampling_rate = sf.read(audio_path)

        # Convert to mono if stereo
        if len(audio_array.shape) > 1:
            audio_array = audio_array.mean(axis=1)

        # Resample if needed
        if sampling_rate != target_sampling_rate:
            import librosa

            audio_array = librosa.resample(
                audio_array, orig_sr=sampling_rate, target_sr=target_sampling_rate
            )

        return audio_array, target_sampling_rate
    except Exception as e:
        print(f"Error loading audio file {audio_path}: {e}")
        # Return silence if loading fails
        return np.zeros(target_sampling_rate), target_sampling_rate


def preprocess_batch(batch, feature_extractor):
    """
    Step 3: Preprocess audio batches
    Convert audio to model input format
    """
    audio_arrays = []

    # Process each audio file
    for audio_info in batch["audio"]:
        if isinstance(audio_info, dict) and "path" in audio_info:
            # Load audio file manually
            audio_array, _ = load_audio_file(audio_info["path"])
        elif isinstance(audio_info, dict) and "array" in audio_info:
            # Audio already loaded
            audio_array = audio_info["array"]
        else:
            # Fallback: try to load from path
            audio_array, _ = load_audio_file(audio_info)

        audio_arrays.append(audio_array)

    # Ensure all audio has the same sampling rate
    target_sampling_rate = 16000

    # Process audio through feature extractor
    inputs = feature_extractor(
        audio_arrays,
        sampling_rate=target_sampling_rate,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=16000,  # 1 second at 16kHz
    )

    # Convert labels to numerical format
    batch["input_values"] = inputs.input_values.tolist()
    for label in batch["label"]:
        if label == 1:
            print("yes")
    batch["labels"] = [1 if label == 1 else 0 for label in batch["label"]]

    return batch


def prepare_datasets(dataset, feature_extractor):
    """
    Step 4: Prepare training and evaluation datasets
    """
    print("Preprocessing dataset...")

    # Apply preprocessing to the entire dataset
    processed_dataset = dataset.map(
        lambda batch: preprocess_batch(batch, feature_extractor),
        batched=True,
        batch_size=16,
        remove_columns=dataset.column_names,  # Remove original columns
    )

    # Split into train and validation sets
    train_test = processed_dataset.train_test_split(test_size=0.2, seed=42)

    train_dataset = train_test["train"]
    eval_dataset = train_test["test"]

    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(eval_dataset)}")

    return train_dataset, eval_dataset


def setup_model():
    """
    Step 5: Set up the audio classification model
    """
    print("Setting up model...")

    model = AutoModelForAudioClassification.from_pretrained(
        "facebook/wav2vec2-base",
        num_labels=2,  # Binary classification: bark or no bark
        ignore_mismatched_sizes=True,
    )

    return model


def setup_training_args():
    """
    Step 6: Configure training arguments
    """
    training_args = TrainingArguments(
        #output_dir="./bark_model",
        # Training configuration
        num_train_epochs=3,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=3e-5,
        weight_decay=0.01,
        warmup_steps=500,
        # Evaluation configuration
        eval_strategy="epoch",
        eval_steps=100,
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_accuracy",
        greater_is_better=True,
        # Logging configuration
        logging_dir="./logs",
        logging_steps=50,
        report_to=None,  # Disable wandb/tensorboard if not needed
        # Save configuration
        save_total_limit=2,  # Keep only 2 best checkpoints
        # Other settings - Fix for Windows multiprocessing
        dataloader_num_workers=0,  # Set to 0 for Windows compatibility
        remove_unused_columns=False,
        push_to_hub=False,  # Set to True if you want to push to HF Hub
    )

    return training_args


def compute_metrics(pred):
    """
    Step 7: Define evaluation metrics
    """
    metric = evaluate.load("accuracy")

    logits = pred.predictions
    preds = np.argmax(logits, axis=-1)

    return metric.compute(predictions=preds, references=pred.label_ids)


def train_model(model, train_dataset, eval_dataset, training_args):
    """
    Step 8: Train the model
    """
    print("Setting up trainer...")

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
    )

    print("Starting training...")
    trainer.train()

    # Evaluate the final model
    print("Evaluating final model...")
    final_metrics = trainer.evaluate()
    print(f"Final evaluation metrics: {final_metrics}")

    # Save the final model
    trainer.save_model("./final_bark_model")
    print("Model saved to ./final_bark_model")

    return trainer


def main():
    """
    Main training pipeline
    """
    print("=== Audio Classification Model Training ===")

    # Step 1: Load and preprocess data
    dataset = load_and_preprocess_audio_data()

    # Step 2: Setup feature extractor
    feature_extractor = setup_feature_extractor()

    # Step 3: Prepare datasets
    train_dataset, eval_dataset = prepare_datasets(dataset, feature_extractor)
    train_df = train_dataset.to_pandas()

    print(train_df)
    eval_df = eval_dataset.to_pandas()

    print(eval_df)

    # Step 4: Setup model
    model = setup_model()

    # Step 5: Setup training arguments
    training_args = setup_training_args()

    # Step 6: Train the model
    trainer = train_model(model, train_dataset, eval_dataset, training_args)

    print("Training completed successfully!")


if __name__ == "__main__":
    main()
