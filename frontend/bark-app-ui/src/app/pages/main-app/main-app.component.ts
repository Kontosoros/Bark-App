import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

import { RecorderAreaComponent } from '../../components/recorder-area/recorder-area.component';
import { AnalyticsComponent } from '../../components/analytics/analytics.component';

@Component({
  selector: 'app-main-app',
  imports: [HeaderComponent, RecorderAreaComponent, AnalyticsComponent],
  templateUrl: './main-app.component.html',
  styleUrl: './main-app.component.scss',
})
export class MainAppComponent {}
