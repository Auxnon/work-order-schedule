import { Component, ElementRef, signal, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { CustomerOverlay } from '../customer-overlay/customer-overlay';
import { Task } from '../task/task';
import { WorkOrderDetails } from '../work-order-details/work-order-details';
import { WorkOrderService } from '../services/work-order.service';
import { WorkOrder } from '../models/work-order.model';

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
  imports: [CommonModule, CustomerOverlay, Task, WorkOrderDetails],
  templateUrl: './scheduler.html',
  styleUrl: './scheduler.scss',
})
export class Scheduler {
  private readonly MS_PER_HOUR = 60 * 60 * 1000;
  private readonly MS_PER_DAY = 86400000;

  private workOrderService = inject(WorkOrderService);

  timescale = signal<Timescale>(Timescale.Month);
  baseDate = signal<Date>(new Date());
  private columnCount = 300;

  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');

  // Hover state
  hoveredClientId = signal<string | null>(null);
  mouseX = signal<number>(0);
  mouseY = signal<number>(0);
  showHoverEffect = signal<boolean>(false);

  // Modal state
  showWorkOrderDetails = signal<boolean>(false);
  selectedWorkOrder = signal<WorkOrder | undefined>(undefined);
  selectedClientId = signal<string | undefined>(undefined);

  clients = this.workOrderService.getClients();
  workOrders = this.workOrderService.getWorkOrders();

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
        date = new Date(base.getTime() + index * this.MS_PER_HOUR);
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
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / this.MS_PER_DAY + 1) / 7);
    return weekNumber;
  }

  onMouseMove(event: MouseEvent): void {
    const ele= this.scrollElement()?.nativeElement
    const scrollerRect=ele ? ele.getBoundingClientRect(): {left:0,top:0};
    // console.log(rec)
    const target = event.currentTarget as HTMLElement;
    // const rect = target.getBoundingClientRect();
    const x = event.clientX - scrollerRect.left;
    let y = event.clientY - scrollerRect.top ;
    if ( y <52)
      return
    y-=52
    console.log(y)

    this.mouseX.set(x);
    this.mouseY.set(y);
    this.showHoverEffect.set(true);

    // Determine which client row we're hovering over
    const rowHeight = 60;
    const clientIndex = Math.floor(y / rowHeight);
    const clients = this.clients();
    if (clientIndex >= 0 && clientIndex < clients.length) {
      this.hoveredClientId.set(clients[clientIndex].id);
    } else {
      this.hoveredClientId.set(null);
    }
  }

  onMouseLeave(): void {
    this.showHoverEffect.set(false);
    this.hoveredClientId.set(null);
  }

  onClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;

    const rowHeight = 60;
    const clientIndex = Math.floor(y / rowHeight);
    const clients = this.clients();

    if (clientIndex >= 0 && clientIndex < clients.length) {
      const clientId = clients[clientIndex].id;
      this.selectedClientId.set(clientId);
      this.selectedWorkOrder.set(undefined);
      this.showWorkOrderDetails.set(true);
    }
  }

  onCloseDetails(): void {
    this.showWorkOrderDetails.set(false);
    this.selectedWorkOrder.set(undefined);
    this.selectedClientId.set(undefined);
  }

  onEditWorkOrder(workOrder: WorkOrder): void {
    this.selectedWorkOrder.set(workOrder);
    this.selectedClientId.set(workOrder.clientId);
    this.showWorkOrderDetails.set(true);
  }

  onDeleteWorkOrder(workOrder: WorkOrder): void {
    if (confirm('Are you sure you want to delete this work order?')) {
      this.workOrderService.deleteWorkOrder(workOrder.id);
    }
  }

  getWorkOrdersForClient(clientId: string): WorkOrder[] {
    return this.workOrders().filter(order => order.clientId === clientId);
  }

  changeTimescale(timescale: Timescale): void {
    this.timescale.set(timescale);
  }

  getTaskLeft(workOrder: WorkOrder): number {
    const baseDate = this.baseDate();
    const startDate = workOrder.startDate;
    const columnWidth = this.getColumnWidth();

    let indexOffset: number;
    switch (this.timescale()) {
      case Timescale.Hour:
        indexOffset = (startDate.getTime() - baseDate.getTime()) / this.MS_PER_HOUR;
        break;
      case Timescale.Day:
        indexOffset = Math.floor((startDate.getTime() - baseDate.getTime()) / this.MS_PER_DAY);
        break;
      case Timescale.Week:
        indexOffset = Math.floor((startDate.getTime() - baseDate.getTime()) / (this.MS_PER_DAY * 7));
        break;
      case Timescale.Month:
        indexOffset = (startDate.getFullYear() - baseDate.getFullYear()) * 12 +
                     (startDate.getMonth() - baseDate.getMonth());
        break;
      default:
        indexOffset = 0;
    }

    return Math.max(0, indexOffset * columnWidth);
  }

  private readonly MIN_TASK_WIDTH_RATIO = 0.3; // Minimum task width is 30% of column width

  getTaskWidth(workOrder: WorkOrder): number {
    const startDate = workOrder.startDate;
    const endDate = workOrder.endDate;
    const columnWidth = this.getColumnWidth();

    let duration: number;
    switch (this.timescale()) {
      case Timescale.Hour:
        duration = (endDate.getTime() - startDate.getTime()) / this.MS_PER_HOUR;
        break;
      case Timescale.Day:
        duration = (endDate.getTime() - startDate.getTime()) / this.MS_PER_DAY;
        break;
      case Timescale.Week:
        duration = (endDate.getTime() - startDate.getTime()) / (this.MS_PER_DAY * 7);
        break;
      case Timescale.Month:
        duration = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                  (endDate.getMonth() - startDate.getMonth());
        break;
      default:
        duration = 1;
    }

    return Math.max(columnWidth * this.MIN_TASK_WIDTH_RATIO, duration * columnWidth);
  }

  readonly Timescale = Timescale;
  readonly Math = Math;
}

