import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AIPrediction } from '../repository/models/note.model';

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
  private analysisResultsSubject = new BehaviorSubject<AIPrediction[]>([]);
  public analysisResults$ = this.analysisResultsSubject.asObservable();

  // Add new analysis result
  addAnalysisResult(result: AIPrediction): void {
    const currentResults = this.analysisResultsSubject.value;
    this.analysisResultsSubject.next([result, ...currentResults]);
  }
}
