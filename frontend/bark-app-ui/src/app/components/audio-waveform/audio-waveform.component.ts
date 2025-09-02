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
    wavBlob: Blob;
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

  // Threshold detection
  threshold = -30; // Default threshold in dB
  currentAmplitude = 0;
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

      // Setup MediaRecorder with supported MIME type
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];

      let mimeType = 'audio/webm;codecs=opus'; // Default fallback

      // Find supported MIME type
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      console.log('Using MediaRecorder MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          // Convert to WAV format
          this.convertToWAV(this.audioChunks, mimeType);

          // Clear chunks after processing
          this.audioChunks = [];
        }
      };

      console.log('Audio stream connected with audio capture capability');
    } catch (error) {
      console.error('Error connecting audio stream:', error);
    }
  }

  /**
   * Convert captured audio chunks to WAV format
   */
  private async convertToWAV(audioChunks: Blob[], originalMimeType: string) {
    try {
      // Create a blob from the audio chunks
      const audioBlob = new Blob(audioChunks, { type: originalMimeType });

      // Convert to WAV using Web Audio API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Convert to WAV format
      const wavBlob = this.audioBufferToWAV(audioBuffer);

      console.log('🎵 WAV file created:', wavBlob.size, 'bytes');

      // Emit the WAV blob for backend processing
      this.thresholdExceeded.emit({
        amplitude: this.currentAmplitude,
        frequency: 0, // Simplified - not calculating frequency
        timestamp: new Date(),
        wavBlob: wavBlob,
      });

      // Clean up
      audioContext.close();
    } catch (error) {
      console.error('Error converting to WAV:', error);

      // Fallback: send original audio format
      const fallbackBlob = new Blob(audioChunks, { type: originalMimeType });
      console.log('⚠️ Using fallback audio format:', originalMimeType);

      this.thresholdExceeded.emit({
        amplitude: this.currentAmplitude,
        frequency: 0,
        timestamp: new Date(),
        wavBlob: fallbackBlob, // Note: this is not actually WAV, but the backend can handle it
      });
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWAV(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // WAV header (44 bytes)
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, audioBuffer.getChannelData(channel)[i])
        );
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private startAudioCapture() {
    if (this.isCapturing) return;

    this.isCapturing = true;
    this.audioChunks = []; // Clear previous chunks
    this.mediaRecorder?.start();

    console.log('🎙️ Audio capture started for WAV file');
  }

  private stopAudioCapture() {
    if (!this.isCapturing) return;

    this.isCapturing = false;
    this.mediaRecorder?.stop();

    console.log('🎙️ Audio capture stopped, processing WAV file');
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

      // Draw simple waveform bars
      const barWidth = width / this.dataArray.length;
      let x = 0;

      for (let i = 0; i < this.dataArray.length; i++) {
        const barHeight = (this.dataArray[i] / 255) * height;
        const color = this.isThresholdExceeded ? '#ef4444' : '#667eea';

        ctx.fillStyle = color;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth;
      }

      // Update audio info and check threshold
      this.updateAudioInfo();
    };

    draw();
  }

  private updateAudioInfo() {
    if (!this.dataArray) return;

    // Calculate average amplitude in dB
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    this.currentAmplitude = Math.round(20 * Math.log10(average / 255));

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

      // Stop audio capture and emit event with WAV file
      if (this.isCapturing) {
        this.stopAudioCapture();
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
