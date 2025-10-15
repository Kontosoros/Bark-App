import { Component } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AudioProcessingService } from '../../services/audio-processing.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent {
  constructor(private audioProcessingService: AudioProcessingService) {}

  view: [number, number] = [700, 400];
  showLegend = false;
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Timestamp';
  yAxisLabel = 'AI Bark Confidence (%)';
  yScaleMin = 0;
  yScaleMax = 1;
  xScaleMin: number = Date.now() - 60000; // Default: 1 minute ago
  xScaleMax: number = Date.now(); // Default: now
  colorScheme = 'cool';

  chartData: any[] = [];

  xAxisTickFormatting = (value: any): string => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  formatTooltipTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatTooltipConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(2)}%`;
  }

  ngOnInit() {
    this.audioProcessingService.analysisResults$.subscribe((results) => {
      if (Array.isArray(results)) this.updateChart(results);
    });
  }

  updateChart(results: any[]) {
    if (!results || results.length === 0) return;

    const series = results
      .filter(
        (r) =>
          r.timestamp && r.confidence !== undefined && r.prediction === 'bark'
      )
      .map((r) => {
        const timestamp = new Date(r.timestamp).getTime();
        const confidence = Number(r.confidence);
        return {
          name: timestamp, // X-axis timestamp
          value: confidence, // Y-axis confidence

          extra: {
            timestamp: timestamp,
            formattedTime: this.formatTooltipTime(timestamp),
            formattedConfidence: this.formatTooltipConfidence(confidence),
          },
        };
      })
      .sort((a, b) => a.name - b.name);

    // Update x-axis time range based on data
    if (series.length > 0) {
      this.xScaleMin = series[0].name; // First timestamp
      this.xScaleMax = series[series.length - 1].name; // Last timestamp
    }

    this.chartData = [
      {
        name: 'Bark Confidence',
        series: series,
      },
    ];
  }
}
