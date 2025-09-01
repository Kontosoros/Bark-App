import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-recorder-area',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './recorder-area.component.html',
  styleUrl: './recorder-area.component.scss',
})
export class RecorderAreaComponent {
  isRecording = false;

  toggleRecording() {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  startRecording() {
    console.log('Recording started');
    // Add your recording logic here
  }

  stopRecording() {
    console.log('Recording stopped');
    // Add your stop recording logic here
  }
}
