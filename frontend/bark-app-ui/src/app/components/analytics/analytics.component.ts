import { Component } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-analytics',
  imports: [NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  // Sample data for the line chart
  multi = [
    {
      name: 'Sales',
      series: [
        { name: 'Jan', value: 12000 },
        { name: 'Feb', value: 15000 },
        { name: 'Mar', value: 18000 },
        { name: 'Apr', value: 22000 },
        { name: 'May', value: 20000 },
      ],
    },
    {
      name: 'Revenue',
      series: [
        { name: 'Jan', value: 10000 },
        { name: 'Feb', value: 14000 },
        { name: 'Mar', value: 17000 },
        { name: 'Apr', value: 21000 },
        { name: 'May', value: 19000 },
      ],
    },
  ];
  // Chart options
  view: [number, number] = [700, 400];
  showLegend = true;
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Month';
  yAxisLabel = 'Amount ($)';
  colorScheme = {
    domain: ['#5AA454', '#E44D25'],
  };
}
