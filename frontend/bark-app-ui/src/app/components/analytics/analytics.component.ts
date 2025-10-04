import { Component } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AudioProcessingService } from '../../services/audio-processing.service';

@Component({
  selector: 'app-analytics',
  imports: [NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  constructor(private audioProcessingService: AudioProcessingService) {}
  // Chart options
  view: [number, number] = [700, 400];
  showLegend = true;
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Timestamp';
  yAxisLabel = 'Percentage of AI';
  colorScheme = {
    domain: ['#5AA454', '#E44D25'],
  };
  chartData: any[] = [];
  ngOnInit() {
    this.audioProcessingService.analysisResults$.subscribe((results) => {
      console.log('results', results);

      this.updateChart(results);
    });
  }

  updateChart(results: any[]) {
    if (!Array.isArray(results)) return;
  
    this.chartData = [
      {
        name: 'Bark Confidence',
        series: results
          // make sure timestamp and confidence exist
          .filter(r => r.timestamp && r.confidence !== undefined && r.confidence >= 0.85 && r.prediction === 'bark')
          // convert timestamp to milliseconds
          .map(r => ({
            name: new Date(r.timestamp).getTime(), // numeric timestamp
            value: Number(r.confidence), // confidence as numeric value
          }))
          // sort by timestamp to have a proper time series
          .sort((a, b) => a.name - b.name)
      }
    ];
  }
  
  
}
