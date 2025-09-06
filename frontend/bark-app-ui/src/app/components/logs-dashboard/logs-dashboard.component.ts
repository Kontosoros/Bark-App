import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface LogEntry {
  timestamp: Date;
  audioFile: string;
  prediction: string;
  confidence: number;
  status: 'completed' | 'processing' | 'failed';
}

@Component({
  selector: 'app-logs-dashboard',
  imports: [CommonModule],
  templateUrl: './logs-dashboard.component.html',
  styleUrl: './logs-dashboard.component.scss',
})
export class LogsDashboardComponent {
  logs: LogEntry[] = [
    {
      timestamp: new Date('2024-01-15T10:30:00'),
      audioFile: 'dog_bark_001.wav',
      prediction: 'Bark Detected',
      confidence: 0.95,
      status: 'completed',
    },
    {
      timestamp: new Date('2024-01-15T10:25:00'),
      audioFile: 'dog_bark_002.wav',
      prediction: 'No Bark',
      confidence: 0.12,
      status: 'completed',
    },
    {
      timestamp: new Date('2024-01-15T10:20:00'),
      audioFile: 'dog_bark_003.wav',
      prediction: 'Bark Detected',
      confidence: 0.87,
      status: 'completed',
    },
    {
      timestamp: new Date('2024-01-15T10:15:00'),
      audioFile: 'dog_bark_004.wav',
      prediction: 'Processing...',
      confidence: 0,
      status: 'processing',
    },
    {
      timestamp: new Date('2024-01-15T10:10:00'),
      audioFile: 'dog_bark_005.wav',
      prediction: 'Error',
      confidence: 0,
      status: 'failed',
    },
  ];
}
