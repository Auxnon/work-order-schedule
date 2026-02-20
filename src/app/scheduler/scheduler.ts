import { Component, ElementRef, signal, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { WorkCenterOverlay } from '../work-center-overlay/work-center-overlay';
import { Task } from '../task/task';
import { WorkOrderDetails } from '../work-order-details/work-order-details';
import { WorkOrderService } from '../services/work-order.service';
import { WorkOrder, WorkOrderStatus } from '../models/work-order.model';

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
  imports: [CommonModule, WorkCenterOverlay, Task, WorkOrderDetails],
  templateUrl: './scheduler.html',
  styleUrl: './scheduler.scss',
})
export class Scheduler {
  private readonly MS_PER_HOUR = 60 * 60 * 1000;
  private readonly MS_PER_DAY = 86400000;
  private readonly HEADER_HEIGHT = 52;
  private readonly ROW_HEIGHT = 60;
  private readonly MIN_TASK_WIDTH_RATIO = 0.3;
  private readonly TASK_DURATION_MONTHS = 3.5;

  private workOrderService = inject(WorkOrderService);

  timescale = signal<Timescale>(Timescale.Month);
  baseDate = signal<Date>(new Date());
  private columnCount = 300;

  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');

  // Hover state
  hoveredWorkCenterId = signal<string | null>(null);
  mouseX = signal<number>(0);
  mouseY = signal<number>(0);
  showHoverEffect = signal<boolean>(false);

  // Modal state
  showWorkOrderDetails = signal<boolean>(false);
  selectedWorkOrder = signal<WorkOrder | undefined>(undefined);
  selectedWorkCenterId = signal<string | undefined>(undefined);
  
  // Error message
  errorMessage = signal<string>('');

  workCenters = this.workOrderService.getWorkCenters();
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
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mouseX.set(x);
    this.mouseY.set(y);
    this.showHoverEffect.set(true);

    // Determine which work center row we're hovering over
    const workCenterIndex = Math.floor(y / this.ROW_HEIGHT);
    const workCenters = this.workCenters();
    if (workCenterIndex >= 0 && workCenterIndex < workCenters.length) {
      this.hoveredWorkCenterId.set(workCenters[workCenterIndex].id);
    } else {
      this.hoveredWorkCenterId.set(null);
    }
  }

  onMouseLeave(): void {
    this.showHoverEffect.set(false);
    this.hoveredWorkCenterId.set(null);
  }

  onClick(event: MouseEvent): void {
    // Clear any previous error
    this.errorMessage.set('');
    
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const workCenterIndex = Math.floor(y / this.ROW_HEIGHT);
    const workCenters = this.workCenters();

    if (workCenterIndex >= 0 && workCenterIndex < workCenters.length) {
      const workCenterId = workCenters[workCenterIndex].id;
      const workCenterName = workCenters[workCenterIndex].name;
      
      // Calculate start date from mouse position
      const columnWidth = this.getColumnWidth();
      const scrollLeft = this.scrollElement()?.nativeElement.scrollLeft || 0;
      const totalX = x + scrollLeft;
      const columnIndex = Math.floor(totalX / columnWidth);
      
      const startDate = this.getDateForColumn(columnIndex).date;
      
      // Calculate end date as 3.5 months from start
      const endDate = new Date(startDate);
      const wholeMonths = Math.floor(this.TASK_DURATION_MONTHS);
      const partialMonth = this.TASK_DURATION_MONTHS % 1;
      
      endDate.setMonth(endDate.getMonth() + wholeMonths);
      
      // For the partial month (0.5), add half the days in the target month
      if (partialMonth > 0) {
        const daysInTargetMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        endDate.setDate(endDate.getDate() + Math.round(daysInTargetMonth * partialMonth));
      }
      
      // Check for overlap
      const hasOverlap = this.workOrderService.hasOverlap(
        workCenterId,
        startDate,
        endDate
      );
      
      if (hasOverlap) {
        this.errorMessage.set(`Cannot create task: overlaps with existing task for ${workCenterName}`);
        setTimeout(() => this.errorMessage.set(''), 5000);
        return;
      }
      
      // Create the work order automatically
      this.workOrderService.addWorkOrder({
        workCenterId,
        name: workCenterName,
        status: WorkOrderStatus.InProgress,
        startDate,
        endDate,
      });
    }
  }

  onCloseDetails(): void {
    this.showWorkOrderDetails.set(false);
    this.selectedWorkOrder.set(undefined);
    this.selectedWorkCenterId.set(undefined);
  }

  onEditWorkOrder(workOrder: WorkOrder): void {
    this.selectedWorkOrder.set(workOrder);
    this.selectedWorkCenterId.set(workOrder.workCenterId);
    this.showWorkOrderDetails.set(true);
  }

  onDeleteWorkOrder(workOrder: WorkOrder): void {
    if (confirm('Are you sure you want to delete this work order?')) {
      this.workOrderService.deleteWorkOrder(workOrder.id);
    }
  }

  getWorkOrdersForWorkCenter(workCenterId: string): WorkOrder[] {
    return this.workOrders().filter(order => order.workCenterId === workCenterId);
  }

  changeTimescale(timescale: Timescale): void {
    this.timescale.set(timescale);
  }

  // Position calculation methods
  getWorkCenterRowTop(workCenterIndex: number): number {
    return this.HEADER_HEIGHT + workCenterIndex * this.ROW_HEIGHT;
  }

  getRowHoverTop(): number {
    const workCenterIndex = Math.floor(this.mouseY() / this.ROW_HEIGHT);
    return workCenterIndex * this.ROW_HEIGHT;
  }

  getMouseHoverTop(): number {
    const workCenterIndex = Math.floor(this.mouseY() / this.ROW_HEIGHT);
    return workCenterIndex * this.ROW_HEIGHT + this.ROW_HEIGHT / 2;
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
}

