import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Scheduler } from './scheduler/scheduler';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Scheduler],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('work-order-schedule');
}
