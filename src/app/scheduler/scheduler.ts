import { Component, ElementRef, viewChild } from '@angular/core';
import { injectVirtualizer } from '@tanstack/angular-virtual';

@Component({
  selector: 'app-scheduler',
  imports: [],
  templateUrl: './scheduler.html',
  styleUrl: './scheduler.scss',
})
export class Scheduler {
  public months: number[] = Array.from({ length: 300 });

  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');

  virtualizer = injectVirtualizer(() => ({
    count: this.months.length,
    estimateSize: () => 60,
    scrollElement: this.scrollElement(),
    overscan: 5,
  }));
}
