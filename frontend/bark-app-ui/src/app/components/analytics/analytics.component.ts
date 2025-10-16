import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AudioProcessingService } from '../../services/audio-processing.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AnalyticsComponent implements OnInit {
  constructor(private audioProcessingService: AudioProcessingService) {}

  // Statistics
  totalBarks = 0;
  totalNoBarks = 0;
  averageConfidence = 0;
  peakTime = '--';
  barksPerHour = 0;
  highConfidenceBarks = 0;

  // Bar Chart settings
  barChartView: [number, number] = [900, 400];
  barChartData: any[] = [];
  barColorScheme: any = {
    domain: ['#4CAF50', '#FF6B6B'], // Green for barks, red for no-barks
  };

  // Common settings
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Hour';
  yAxisLabel = 'Count';
  showGridLines = true;
  showLegend = true;
  animations = true;

  ngOnInit() {
    this.audioProcessingService.analysisResults$.subscribe((results) => {
      if (Array.isArray(results)) {
        this.updateDashboard(results);
      }
    });
  }

  updateDashboard(results: any[]) {
    console.log(results);
    if (!results || results.length === 0) {
      this.resetStats();
      return;
    }

    // Filter valid results
    const validResults = results.filter(
      (r) => r.timestamp && r.confidence !== undefined && r.prediction
    );

    if (validResults.length === 0) {
      this.resetStats();
      return;
    }

    // Group data by hour
    const hourlyData = new Map<string, { barks: number; noBarks: number }>();

    validResults.forEach((result) => {
      const date = new Date(result.timestamp);
      const hour = date.getHours();
      const hourKey = this.formatHour(hour);

      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { barks: 0, noBarks: 0 });
      }

      const data = hourlyData.get(hourKey)!;
      const isBark = result.prediction.toLowerCase() == 'bark';

      if (isBark) {
        data.barks++;
      }
    });
    console.log(hourlyData);
    // Transform data for ngx-charts grouped bar chart
    this.barChartData = Array.from(hourlyData.entries()).map(
      ([hour, data]) => ({
        name: hour,
        series: [{ name: 'Barks', value: data.barks, color: '#4CAF50' }],
      })
    );

    // Update statistics
    this.calculateStatistics(validResults);
  }

  calculateStatistics(results: any[]) {
    // Separate barks and no-barks
    const barkResults = results.filter(
      (r) => r.prediction.toLowerCase() == 'bark'
    );

    this.totalBarks = barkResults.length;

    // Calculate average confidence for barks only
    if (barkResults.length > 0) {
      const sumConfidence = barkResults.reduce(
        (sum, r) => sum + Number(r.confidence),
        0
      );
      this.averageConfidence = (sumConfidence / barkResults.length) * 100;
    } else {
      this.averageConfidence = 0;
    }

    // Calculate high confidence barks (>70%)
    this.highConfidenceBarks = barkResults.filter(
      (r) => Number(r.confidence) >= 0.7
    ).length;

    // Find peak time (hour with most barks)
    const hourCounts = new Map<number, number>();
    barkResults.forEach((r) => {
      const hour = new Date(r.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let maxCount = 0;
    let peakHour = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    this.peakTime = hourCounts.size > 0 ? this.formatHour(peakHour) : '--';

    // Calculate barks per hour
    if (barkResults.length > 0) {
      const firstTimestamp = new Date(
        barkResults[barkResults.length - 1].timestamp
      ).getTime();
      const lastTimestamp = new Date(barkResults[0].timestamp).getTime();
      const hoursDiff = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60);
      this.barksPerHour = hoursDiff > 0 ? barkResults.length / hoursDiff : 0;
    } else {
      this.barksPerHour = 0;
    }
  }

  resetStats() {
    this.totalBarks = 0;
    this.totalNoBarks = 0;
    this.averageConfidence = 0;
    this.peakTime = '--';
    this.barksPerHour = 0;
    this.highConfidenceBarks = 0;
    this.barChartData = [];
  }

  formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  }
}
