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

  constructor(private dialog: MatDialog) {}

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

  onLoudNoiseDetected(event: {
    amplitude: number;
    frequency: number;
    timestamp: Date;
  }) {
    this.loudNoiseCount++;
    this.lastLoudNoise = event.timestamp;

    console.log(`🚨 Loud noise detected! (${this.loudNoiseCount} total)`);
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
