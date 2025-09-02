import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ElementRef,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audio-waveform',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-waveform.component.html',
  styleUrl: './audio-waveform.component.scss',
})
export class AudioWaveformComponent implements OnInit, OnDestroy {
  @Input() audioStream: MediaStream | null = null;
  @Output() thresholdExceeded = new EventEmitter<{
    amplitude: number;
    frequency: number;
    timestamp: Date;
    audioData: Float32Array;
    sampleRate: number;
  }>();

  @ViewChild('waveformCanvas', { static: true })
  waveformCanvas!: ElementRef<HTMLCanvasElement>;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isCapturing = false;
  private captureDuration = 3000; // Capture 3 seconds of audio
  private captureStartTime = 0;

  // Threshold and audio tracking
  threshold = -30; // Default threshold in dB
  currentFrequency = 0;
  currentAmplitude = 0;
  peakAmplitude = -60;
  isThresholdExceeded = false;
  private lastThresholdTime = 0;
  private thresholdCooldown = 1000; // 1 second cooldown between alerts

  ngOnInit() {
    this.initializeAudioContext();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  onThresholdChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.threshold = parseInt(target.value);
    console.log(`Threshold set to: ${this.threshold} dB`);
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.startVisualization();
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }

  public connectAudioStream(stream: MediaStream) {
    if (!this.audioContext || !this.analyser) return;

    try {
      // Disconnect previous source if exists
      if (this.source) {
        this.source.disconnect();
      }

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Create script processor for audio capture
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.audioChunks = []; // Clear chunks after stopping

          // Convert Blob to ArrayBuffer for processing
          const reader = new FileReader();
          reader.readAsArrayBuffer(audioBlob);
          reader.onloadend = () => {
            if (reader.result) {
              const audioData = new Float32Array(reader.result as ArrayBuffer);
              this.thresholdExceeded.emit({
                amplitude: this.currentAmplitude,
                frequency: this.currentFrequency,
                timestamp: new Date(),
                audioData: audioData,
                sampleRate: this.audioContext?.sampleRate || 44100,
              });
            }
          };
        }
      };

      console.log('Audio stream connected to waveform with capture capability');
    } catch (error) {
      console.error('Error connecting audio stream:', error);
    }
  }

  private startAudioCapture() {
    if (this.isCapturing) return;

    this.isCapturing = true;
    this.captureStartTime = Date.now();
    this.audioChunks = []; // Clear previous chunks
    this.mediaRecorder?.start();

    console.log('🎙️ Audio capture started for AI processing');
  }

  private stopAudioCapture() {
    if (!this.isCapturing) return;

    this.isCapturing = false;
    this.mediaRecorder?.stop();

    console.log(
      `🎙️ Audio capture completed: ${this.audioChunks.length} chunks captured`
    );

    return null; // MediaRecorder handles the actual audio data
  }

  private startVisualization() {
    if (!this.analyser || !this.dataArray) return;

    const canvas = this.waveformCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      this.animationId = requestAnimationFrame(draw);

      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      // Draw threshold line
      const thresholdY = height - ((this.threshold + 60) / 60) * height;
      ctx.strokeStyle = this.isThresholdExceeded ? '#ef4444' : '#667eea';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw waveform bars
      const barWidth = width / this.dataArray.length;
      let x = 0;

      for (let i = 0; i < this.dataArray.length; i++) {
        const barHeight = (this.dataArray[i] / 255) * height;
        const hue = (i / this.dataArray.length) * 360;

        // Change color when threshold is exceeded
        if (this.isThresholdExceeded) {
          ctx.fillStyle = '#ef4444';
        } else {
          ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        }

        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth;
      }

      // Calculate and display frequency and amplitude
      this.updateAudioInfo();
    };

    draw();
  }

  private updateAudioInfo() {
    if (!this.dataArray) return;

    // Calculate dominant frequency
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }

    // Convert index to frequency (approximate)
    this.currentFrequency = Math.round(
      (maxIndex * (this.audioContext?.sampleRate || 44100)) / 512
    );

    // Calculate average amplitude in dB
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    this.currentAmplitude = Math.round(20 * Math.log10(average / 255));

    // Update peak amplitude
    if (this.currentAmplitude > this.peakAmplitude) {
      this.peakAmplitude = this.currentAmplitude;
    }

    // Check threshold
    this.checkThreshold();
  }

  private checkThreshold() {
    const now = Date.now();

    if (this.currentAmplitude > this.threshold && !this.isThresholdExceeded) {
      // Threshold exceeded
      this.isThresholdExceeded = true;

      // Start audio capture
      this.startAudioCapture();

      // Emit event with cooldown
      if (now - this.lastThresholdTime > this.thresholdCooldown) {
        this.lastThresholdTime = now;
      }
    } else if (
      this.currentAmplitude <= this.threshold &&
      this.isThresholdExceeded
    ) {
      // Below threshold again
      this.isThresholdExceeded = false;

      // Stop audio capture and emit event with captured data
      if (this.isCapturing) {
        const capturedAudio = this.stopAudioCapture();

        if (capturedAudio && this.audioContext) {
          // The capturedAudio is now handled by the MediaRecorder onstop callback
          // We can still emit an event if needed, but the data is already processed
          // For now, we'll just log the completion.
          console.log('Threshold exceeded, audio capture stopped.');
        }
      }
    }
  }

  private cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.source) {
      this.source.disconnect();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
