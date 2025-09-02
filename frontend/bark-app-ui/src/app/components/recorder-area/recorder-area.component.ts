import { Component, Inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AudioWaveformComponent } from '../audio-waveform/audio-waveform.component';
import {
  AudioProcessingService,
  ProcessedAudioData,
} from '../../services/audio-processing.service';

interface AudioCaptureEvent {
  amplitude: number;
  frequency: number;
  timestamp: Date;
  audioData: Float32Array;
  sampleRate: number;
}

@Component({
  selector: 'app-recorder-area',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    CommonModule,
    AudioWaveformComponent,
  ],
  templateUrl: './recorder-area.component.html',
  styleUrl: './recorder-area.component.scss',
})
export class RecorderAreaComponent {
  isRecording = false;
  hasMicrophonePermission = false;
  private audioStream: MediaStream | null = null;
  @ViewChild(AudioWaveformComponent) waveformComponent!: AudioWaveformComponent;

  // Threshold detection tracking
  loudNoiseCount = 0;
  lastLoudNoise: Date | null = null;
  capturedAudioSamples: AudioCaptureEvent[] = [];
  processedAudioSamples: ProcessedAudioData[] = [];

  constructor(
    private dialog: MatDialog,
    private audioProcessingService: AudioProcessingService
  ) {}

  async toggleRecording() {
    if (!this.isRecording) {
      // Starting recording - check permissions first
      await this.checkMicrophonePermission();
    } else {
      // Stopping recording
      this.stopRecording();
    }
  }

  async checkMicrophonePermission() {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Permission granted
      this.hasMicrophonePermission = true;
      this.audioStream = stream;
      this.startRecording();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      this.showMicrophonePermissionDialog();
    }
  }

  showMicrophonePermissionDialog() {
    const dialogRef = this.dialog.open(MicrophonePermissionDialog, {
      width: '400px',
      data: {
        message: 'Microphone access is required to detect barking sounds.',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'retry') {
        // User wants to retry
        this.checkMicrophonePermission();
      }
    });
  }

  startRecording() {
    this.isRecording = true;

    // Connect audio stream to waveform component
    if (this.audioStream && this.waveformComponent) {
      this.waveformComponent.connectAudioStream(this.audioStream);

      // Subscribe to threshold exceeded events
      this.waveformComponent.thresholdExceeded.subscribe((event) => {
        this.onLoudNoiseDetected(event);
      });
    }

    // Add your actual recording logic here
  }

  stopRecording() {
    this.isRecording = false;

    // Stop all audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    // Add your stop recording logic here
  }

  async onLoudNoiseDetected(event: AudioCaptureEvent) {
    this.loudNoiseCount++;
    this.lastLoudNoise = event.timestamp;

    // Store the captured audio sample
    this.capturedAudioSamples.push(event);

    console.log(`🚨 Loud noise detected! (${this.loudNoiseCount} total)`);
    console.log(`   Amplitude: ${event.amplitude} dB`);
    console.log(`   Frequency: ${event.frequency} Hz`);
    console.log(`   Time: ${event.timestamp.toLocaleTimeString()}`);
    console.log(`   Audio samples: ${event.audioData.length}`);
    console.log(`   Sample rate: ${event.sampleRate} Hz`);

    // Process the audio data for AI model using the service
    await this.processAudioForAI(event);
  }

  private async processAudioForAI(audioEvent: AudioCaptureEvent) {
    try {
      console.log('🎯 Processing audio for AI model...');

      // Use the audio processing service (mirrors your Python logic)
      const processedData = await this.audioProcessingService.processAudioForAI(
        audioEvent.audioData,
        audioEvent.sampleRate,
        16000, // Target sample rate (same as your Python code)
        {
          amplitude: audioEvent.amplitude,
          frequency: audioEvent.frequency,
        }
      );

      // Store processed data
      this.processedAudioSamples.push(processedData);

      // Prepare data for AI model
      const aiInputData =
        this.audioProcessingService.prepareForAIModel(processedData);

      console.log('🤖 AI-ready data prepared:', {
        sampleCount: aiInputData.audio_features.samples.length,
        duration: aiInputData.audio_features.duration.toFixed(2) + 's',
        sampleRate: aiInputData.audio_features.sample_rate,
        features: Object.keys(aiInputData.extracted_features),
      });

      // Send to AI model
      await this.sendToAIModel(aiInputData);
    } catch (error) {
      console.error('Error processing audio for AI:', error);
    }
  }

  private async sendToAIModel(audioData: any) {
    try {
      console.log('🤖 Sending processed audio data to AI model...');

      // Option 1: Send to your Django backend API
      // const response = await fetch('/api/analyze-audio', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(audioData)
      // });

      // Option 2: Use TensorFlow.js or other client-side ML
      // const prediction = await this.tensorflowModel.predict(audioData.audio_features.samples);

      // Option 3: Save for later processing
      this.saveProcessedAudioSample(audioData);

      console.log('✅ Processed audio data sent to AI model successfully');
    } catch (error) {
      console.error('Error sending to AI model:', error);
    }
  }

  private saveProcessedAudioSample(audioData: any) {
    try {
      // Save to localStorage (for demo purposes)
      const savedSamples = JSON.parse(
        localStorage.getItem('processedBarkAudioSamples') || '[]'
      );
      savedSamples.push(audioData);
      localStorage.setItem(
        'processedBarkAudioSamples',
        JSON.stringify(savedSamples)
      );

      console.log(
        `💾 Processed audio sample saved. Total samples: ${savedSamples.length}`
      );
    } catch (error) {
      console.error('Error saving processed audio sample:', error);
    }
  }

  // Method to get all captured audio samples (useful for batch processing)
  getAllCapturedAudio() {
    return this.capturedAudioSamples;
  }

  // Method to get all processed audio samples
  getAllProcessedAudio() {
    return this.processedAudioSamples;
  }

  // Method to clear captured audio samples
  clearCapturedAudio() {
    this.capturedAudioSamples = [];
    this.processedAudioSamples = [];
    console.log('🗑️ All captured and processed audio samples cleared');
  }

  // Method to calculate total audio duration
  getTotalAudioDuration(): number {
    return this.capturedAudioSamples.reduce((total, sample) => {
      return total + sample.audioData.length / sample.sampleRate;
    }, 0);
  }

  // Method to export audio samples for external processing
  exportAudioSamples() {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        sampleCount: this.capturedAudioSamples.length,
        totalDuration: this.getTotalAudioDuration(),
        samples: this.capturedAudioSamples.map((sample) => ({
          timestamp: sample.timestamp.toISOString(),
          amplitude: sample.amplitude,
          frequency: sample.frequency,
          sampleRate: sample.sampleRate,
          duration: sample.audioData.length / sample.sampleRate,
          audioData: Array.from(sample.audioData),
        })),
        processedSamples: this.processedAudioSamples.map((sample) => ({
          timestamp: sample.metadata.timestamp.toISOString(),
          sampleRate: sample.sampleRate,
          duration: sample.duration,
          features: sample.features,
          metadata: sample.metadata,
        })),
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `bark-audio-samples-${
        new Date().toISOString().split('T')[0]
      }.json`;
      link.click();

      URL.revokeObjectURL(url);

      console.log('📁 Audio samples exported successfully');
    } catch (error) {
      console.error('Error exporting audio samples:', error);
    }
  }

  // Method to export processed audio as WAV files
  exportProcessedAudioAsWAV() {
    this.processedAudioSamples.forEach((sample, index) => {
      const filename = `processed-audio-${index + 1}-${
        sample.metadata.timestamp.toISOString().split('T')[0]
      }.wav`;
      this.audioProcessingService.exportAsWAV(
        sample.audioArray,
        sample.sampleRate,
        filename
      );
    });
  }
}

// Dialog component for microphone permission
@Component({
  selector: 'microphone-permission-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, CommonModule],
  template: `
    <h2 mat-dialog-title>Microphone Permission Required</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <p>Please allow microphone access in your browser to continue.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="retry()">Retry</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        margin: 1rem 0;
      }
      mat-dialog-actions {
        padding: 1rem 0;
      }
    `,
  ],
})
export class MicrophonePermissionDialog {
  constructor(
    public dialogRef: MatDialogRef<MicrophonePermissionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}

  retry() {
    this.dialogRef.close('retry');
  }
}
