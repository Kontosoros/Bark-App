import { Injectable } from '@angular/core';

export interface ProcessedAudioData {
  audioArray: number[];
  sampleRate: number;
  duration: number;
  features: {
    mfcc?: number[][];
    spectrogram?: number[][];
    melSpectrogram?: number[][];
  };
  metadata: {
    originalSampleRate: number;
    targetSampleRate: number;
    isMono: boolean;
    timestamp: Date;
    amplitude: number;
    frequency: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AudioProcessingService {
  constructor() {}

  /**
   * Process captured audio data for AI model input
   * Mirrors the Python load_audio_file functionality
   */
  async processAudioForAI(
    audioData: Float32Array,
    originalSampleRate: number,
    targetSampleRate: number = 16000,
    metadata?: any
  ): Promise<ProcessedAudioData> {
    try {
      console.log('🎵 Processing audio for AI model...');
      console.log(`   Original sample rate: ${originalSampleRate} Hz`);
      console.log(`   Target sample rate: ${targetSampleRate} Hz`);
      console.log(`   Audio length: ${audioData.length} samples`);

      // Convert Float32Array to regular array
      let audioArray = Array.from(audioData);

      // Ensure mono (single channel)
      audioArray = this.convertToMono(audioArray);

      // Resample if needed
      if (originalSampleRate !== targetSampleRate) {
        audioArray = this.resampleAudio(
          audioArray,
          originalSampleRate,
          targetSampleRate
        );
        console.log(`   Resampled to ${targetSampleRate} Hz`);
      }

      // Calculate duration
      const duration = audioArray.length / targetSampleRate;

      // Normalize audio (optional but recommended for ML)
      audioArray = this.normalizeAudio(audioArray);

      // Extract audio features (similar to what you might do in Python)
      const features = await this.extractAudioFeatures(
        audioArray,
        targetSampleRate
      );

      const processedData: ProcessedAudioData = {
        audioArray,
        sampleRate: targetSampleRate,
        duration,
        features,
        metadata: {
          originalSampleRate: originalSampleRate,
          targetSampleRate: targetSampleRate,
          isMono: true,
          timestamp: new Date(),
          amplitude: metadata?.amplitude || 0,
          frequency: metadata?.frequency || 0,
        },
      };

      console.log(`✅ Audio processing completed:`);
      console.log(`   Final length: ${audioArray.length} samples`);
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Sample rate: ${targetSampleRate} Hz`);

      return processedData;
    } catch (error) {
      console.error('❌ Error processing audio for AI:', error);
      throw error;
    }
  }

  /**
   * Convert stereo to mono if needed
   */
  private convertToMono(audioArray: number[]): number[] {
    // If it's already a 1D array, it's mono
    if (Array.isArray(audioArray) && typeof audioArray[0] === 'number') {
      return audioArray;
    }

    // If it's a 2D array (stereo), convert to mono by averaging channels
    if (Array.isArray(audioArray[0])) {
      const stereoArray = audioArray as unknown as number[][];
      const monoArray: number[] = [];

      for (let i = 0; i < stereoArray[0].length; i++) {
        const left = stereoArray[0][i] || 0;
        const right = stereoArray[1]?.[i] || 0;
        monoArray.push((left + right) / 2);
      }

      return monoArray;
    }

    return audioArray;
  }

  /**
   * Resample audio to target sample rate
   * Uses simple linear interpolation for basic resampling
   */
  private resampleAudio(
    audioArray: number[],
    originalRate: number,
    targetRate: number
  ): number[] {
    if (originalRate === targetRate) {
      return audioArray;
    }

    const ratio = targetRate / originalRate;
    const newLength = Math.round(audioArray.length * ratio);
    const resampledArray: number[] = [];

    for (let i = 0; i < newLength; i++) {
      const originalIndex = i / ratio;
      const lowerIndex = Math.floor(originalIndex);
      const upperIndex = Math.min(lowerIndex + 1, audioArray.length - 1);
      const fraction = originalIndex - lowerIndex;

      if (lowerIndex === upperIndex) {
        resampledArray.push(audioArray[lowerIndex]);
      } else {
        // Linear interpolation
        const lowerValue = audioArray[lowerIndex];
        const upperValue = audioArray[upperIndex];
        const interpolatedValue =
          lowerValue + (upperValue - lowerValue) * fraction;
        resampledArray.push(interpolatedValue);
      }
    }

    return resampledArray;
  }

  /**
   * Normalize audio to prevent clipping and improve ML performance
   */
  private normalizeAudio(audioArray: number[]): number[] {
    const maxValue = Math.max(...audioArray.map(Math.abs));

    if (maxValue === 0) {
      return audioArray;
    }

    const normalizationFactor = 0.95 / maxValue; // Leave some headroom
    return audioArray.map((sample) => sample * normalizationFactor);
  }

  /**
   * Extract audio features for ML models
   * This is a simplified version - you can enhance this based on your needs
   */
  private async extractAudioFeatures(
    audioArray: number[],
    sampleRate: number
  ): Promise<any> {
    try {
      // Basic feature extraction (you can enhance this)
      const features: any = {};

      // Calculate RMS (Root Mean Square) - basic amplitude feature
      const rms = this.calculateRMS(audioArray);
      features.rms = rms;

      // Calculate zero crossing rate - basic frequency feature
      const zcr = this.calculateZeroCrossingRate(audioArray);
      features.zeroCrossingRate = zcr;

      // Calculate spectral centroid (approximation)
      const spectralCentroid = this.calculateSpectralCentroid(
        audioArray,
        sampleRate
      );
      features.spectralCentroid = spectralCentroid;

      // Calculate spectral rolloff (approximation)
      const spectralRolloff = this.calculateSpectralRolloff(
        audioArray,
        sampleRate
      );
      features.spectralRolloff = spectralRolloff;

      return features;
    } catch (error) {
      console.warn(
        '⚠️ Feature extraction failed, returning basic features:',
        error
      );
      return {
        rms: this.calculateRMS(audioArray),
        zeroCrossingRate: this.calculateZeroCrossingRate(audioArray),
      };
    }
  }

  /**
   * Calculate Root Mean Square (RMS) of audio
   */
  private calculateRMS(audioArray: number[]): number {
    const sum = audioArray.reduce((acc, sample) => acc + sample * sample, 0);
    return Math.sqrt(sum / audioArray.length);
  }

  /**
   * Calculate Zero Crossing Rate
   */
  private calculateZeroCrossingRate(audioArray: number[]): number {
    let crossings = 0;
    for (let i = 1; i < audioArray.length; i++) {
      if (audioArray[i] >= 0 !== audioArray[i - 1] >= 0) {
        crossings++;
      }
    }
    return crossings / audioArray.length;
  }

  /**
   * Calculate spectral centroid (approximation)
   */
  private calculateSpectralCentroid(
    audioArray: number[],
    sampleRate: number
  ): number {
    // Simple approximation using FFT-like analysis
    const fftSize = Math.min(1024, audioArray.length);
    const frequencies = new Array(fftSize)
      .fill(0)
      .map((_, i) => (i * sampleRate) / fftSize);

    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < fftSize; i++) {
      const magnitude = Math.abs(audioArray[i] || 0);
      weightedSum += frequencies[i] * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff (approximation)
   */
  private calculateSpectralRolloff(
    audioArray: number[],
    sampleRate: number
  ): number {
    // Simple approximation
    const threshold = 0.85; // 85% energy threshold
    const fftSize = Math.min(1024, audioArray.length);

    let totalEnergy = 0;
    for (let i = 0; i < fftSize; i++) {
      totalEnergy += Math.pow(audioArray[i] || 0, 2);
    }

    let cumulativeEnergy = 0;
    for (let i = 0; i < fftSize; i++) {
      cumulativeEnergy += Math.pow(audioArray[i] || 0, 2);
      if (cumulativeEnergy >= threshold * totalEnergy) {
        return (i * sampleRate) / fftSize;
      }
    }

    return sampleRate / 2; // Default to Nyquist frequency
  }

  /**
   * Convert processed audio to format suitable for your AI model
   */
  prepareForAIModel(processedData: ProcessedAudioData): any {
    return {
      audio_features: {
        samples: processedData.audioArray,
        sample_rate: processedData.sampleRate,
        duration: processedData.duration,
      },
      extracted_features: processedData.features,
      metadata: processedData.metadata,
    };
  }

  /**
   * Export processed audio as WAV file (for debugging/testing)
   */
  exportAsWAV(
    audioArray: number[],
    sampleRate: number,
    filename: string = 'audio.wav'
  ): void {
    try {
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(audioArray.length);
      for (let i = 0; i < audioArray.length; i++) {
        pcmData[i] = Math.max(
          -32768,
          Math.min(32767, Math.round(audioArray[i] * 32767))
        );
      }

      // Create WAV header
      const wavHeader = this.createWAVHeader(pcmData.length, sampleRate);

      // Combine header and audio data
      const wavFile = new Uint8Array(wavHeader.length + pcmData.length * 2);
      wavFile.set(wavHeader, 0);
      wavFile.set(new Uint8Array(pcmData.buffer), wavHeader.length);

      // Download file
      const blob = new Blob([wavFile], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      console.log(`📁 WAV file exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting WAV file:', error);
    }
  }

  /**
   * Create WAV file header
   */
  private createWAVHeader(dataLength: number, sampleRate: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength * 2, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength * 2, true);

    return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Send processed audio data to Django backend for AI inference
   * Matches the Python backend API expectations
   */

  /**
   * Alternative: Send raw audio data for backend processing (like your Python code)
   * This lets the backend handle all feature extraction
   */
}
