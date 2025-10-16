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
  xAxisLabel = 'Time (Minute)';
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

    // Group data by minute
    const minuteData = new Map<string, { barks: number; noBarks: number }>();

    validResults.forEach((result) => {
      const date = new Date(result.timestamp);
      const minuteKey = this.formatMinute(date);

      if (!minuteData.has(minuteKey)) {
        minuteData.set(minuteKey, { barks: 0, noBarks: 0 });
      }

      const data = minuteData.get(minuteKey)!;
      const isBark = result.prediction.toLowerCase() == 'bark';

      if (isBark) {
        data.barks++;
      } else {
        data.noBarks++;
      }
    });

    // Transform data for ngx-charts grouped bar chart
    this.barChartData = Array.from(minuteData.entries()).map(
      ([minute, data]) => ({
        name: minute,
        series: [
          { name: 'Barks', value: data.barks },
          { name: 'No Barks', value: data.noBarks },
        ],
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
    const noBarkResults = results.filter(
      (r) => r.prediction.toLowerCase() != 'bark'
    );

    this.totalBarks = barkResults.length;
    this.totalNoBarks = noBarkResults.length;

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

    // Find peak time (minute with most barks)
    const minuteCounts = new Map<string, number>();
    barkResults.forEach((r) => {
      const date = new Date(r.timestamp);
      const minuteKey = this.formatMinute(date);
      minuteCounts.set(minuteKey, (minuteCounts.get(minuteKey) || 0) + 1);
    });

    let maxCount = 0;
    let peakMinute = '';
    minuteCounts.forEach((count, minute) => {
      if (count > maxCount) {
        maxCount = count;
        peakMinute = minute;
      }
    });

    this.peakTime = minuteCounts.size > 0 ? peakMinute : '--';

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

  formatMinute(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMinute = minutes.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }
}
