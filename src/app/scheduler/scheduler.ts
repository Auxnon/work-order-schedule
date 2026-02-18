import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { injectVirtualizer } from '@tanstack/angular-virtual';

export enum Timescale {
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

interface DateColumn {
  date: Date;
  label: string;
}

@Component({
  selector: 'app-scheduler',
  imports: [],
  templateUrl: './scheduler.html',
  styleUrl: './scheduler.scss',
})
export class Scheduler {
  public timescale = signal<Timescale>(Timescale.Month);
  private columnCount = 300;

  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');

  virtualizer = injectVirtualizer(() => ({
    count: this.columnCount,
    estimateSize: () => this.getColumnWidth(),
    scrollElement: this.scrollElement(),
    overscan: 5,
    horizontal: true,
  }));

  private getColumnWidth(): number {
    switch (this.timescale()) {
      case Timescale.Hour:
        return 120;
      case Timescale.Day:
        return 150;
      case Timescale.Week:
        return 200;
      case Timescale.Month:
        return 250;
      default:
        return 150;
    }
  }

  getDateForColumn(index: number): DateColumn {
    const now = new Date();
    let date: Date;
    let label: string;

    switch (this.timescale()) {
      case Timescale.Hour:
        date = new Date(now.getTime() + index * 60 * 60 * 1000);
        label = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true,
        });
        break;
      case Timescale.Day:
        date = new Date(now);
        date.setDate(now.getDate() + index);
        label = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        break;
      case Timescale.Week:
        date = new Date(now);
        date.setDate(now.getDate() + index * 7);
        label = `Week ${this.getWeekNumber(date)}`;
        break;
      case Timescale.Month:
        date = new Date(now);
        date.setMonth(now.getMonth() + index);
        label = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        break;
      default:
        date = now;
        label = '';
    }

    return { date, label };
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
