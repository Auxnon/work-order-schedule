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
  public baseDate = signal<Date>(new Date());
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
    const base = this.baseDate();
    let date: Date;
    let label: string;

    switch (this.timescale()) {
      case Timescale.Hour:
        date = new Date(base.getTime() + index * 60 * 60 * 1000);
        label = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true,
        });
        break;
      case Timescale.Day:
        date = new Date(base);
        date.setDate(base.getDate() + index);
        label = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        break;
      case Timescale.Week:
        date = new Date(base);
        date.setDate(base.getDate() + index * 7);
        label = `Week ${this.getWeekNumber(date)}`;
        break;
      case Timescale.Month:
        date = new Date(base);
        date.setMonth(base.getMonth() + index);
        label = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        break;
      default:
        date = base;
        label = '';
    }

    return { date, label };
  }

  private getWeekNumber(date: Date): number {
    // ISO 8601 week calculation
    // Week 1 is the week with the first Thursday of the year
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday (0) equal to 7
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNumber;
  }
}
