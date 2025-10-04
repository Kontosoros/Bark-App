import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AudioProcessingService } from '../../services/audio-processing.service';
import { AIPrediction } from '../../repository/models/note.model';

@Component({
  selector: 'app-logs-dashboard',
  imports: [CommonModule],
  templateUrl: './logs-dashboard.component.html',
  styleUrl: './logs-dashboard.component.scss',
})
export class LogsDashboardComponent {
  logs: AIPrediction[] = [];

  constructor(private audioProcessingService: AudioProcessingService) {}
  ngOnInit() {
    this.audioProcessingService.analysisResults$.subscribe((results) => {
      this.logs = results;
      
    });
  }
}
