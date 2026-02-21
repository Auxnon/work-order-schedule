import { Component, ElementRef, signal, viewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { WorkCenterOverlay } from '../work-center-overlay/work-center-overlay';
import { Task } from '../task/task';
import { WorkOrderDetails } from '../work-order-details/work-order-details';
import { WorkOrderService } from '../services/work-order.service';
import { WorkOrderDocument } from '../models/work-order.model';

export enum Timescale {
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

  private workOrderService = inject(WorkOrderService);

  timescale = signal<Timescale>(Timescale.Day);
  baseDate = signal<Date>(new Date());
  columnCount = signal<number>(300);

  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');

  // Hover state
  hoveredWorkCenterId = signal<string | null>(null);
  mouseX = signal<number>(0);
  mouseY = signal<number>(0);
  showHoverEffect = signal<boolean>(false);

  // Modal state
  showWorkOrderDetails = signal<boolean>(false);
  selectedWorkOrder = signal<WorkOrderDocument | undefined>(undefined);
  selectedWorkCenterId = signal<string | undefined>(undefined);
  selectedDefaultStartDate = signal<string | undefined>(undefined);
  selectedDefaultEndDate = signal<string | undefined>(undefined);

  // Error message
  errorMessage = signal<string>('');

  workCenters = this.workOrderService.getWorkCenters();
  workOrders = this.workOrderService.getWorkOrders();

  virtualizer = injectVirtualizer(() => ({
    count: this.columnCount(),
    estimateSize: () => this.getColumnWidth(),
    scrollElement: this.scrollElement(),
    overscan: 5,
    horizontal: true,
  }));

  constructor() {
    // Initialize date range and scroll position whenever timescale or work orders change
    effect(() => {
      this.updateDateRangeAndScroll();
    });
  }

  private updateDateRangeAndScroll(): void {
    const orders = this.workOrders();
    const now = new Date();
    
    // Calculate min and max dates from work orders
    let minDate: Date | undefined;
    let maxDate: Date | undefined;
    
    for (const order of orders) {
      const start = this.parseIsoDate(order.data.startDate);
      const end = this.parseIsoDate(order.data.endDate);
      if (!minDate || start < minDate) {
        minDate = start;
      }
      if (!maxDate || end > maxDate) {
        maxDate = end;
      }
    }
    
    // Determine base date and column count based on timescale
    let baseDate: Date;
    let columnCount: number;
    let currentColumnIndex: number;
    
    const timescale = this.timescale();
    const buffer = 2; // +/- 2 units
    
    switch (timescale) {
      case Timescale.Day:
        if (minDate && maxDate) {
          const minTime = new Date(minDate);
          minTime.setDate(minTime.getDate() - buffer);
          const maxTime = new Date(maxDate);
          maxTime.setDate(maxTime.getDate() + buffer);
          
          baseDate = minTime;
          const totalDays = Math.ceil((maxTime.getTime() - minTime.getTime()) / this.MS_PER_DAY);
          columnCount = Math.max(30, totalDays);
          
          // Calculate current day index
          currentColumnIndex = Math.floor((now.getTime() - baseDate.getTime()) / this.MS_PER_DAY);
        } else {
          // No tasks, show current day with buffer
          baseDate = new Date(now);
          baseDate.setDate(baseDate.getDate() - buffer);
          columnCount = 30;
          currentColumnIndex = buffer;
        }
        break;
        
      case Timescale.Week:
        if (minDate && maxDate) {
          const minTime = new Date(minDate);
          minTime.setDate(minTime.getDate() - (buffer * 7));
          const maxTime = new Date(maxDate);
          maxTime.setDate(maxTime.getDate() + (buffer * 7));
          
          baseDate = minTime;
          const totalWeeks = Math.ceil((maxTime.getTime() - minTime.getTime()) / (this.MS_PER_DAY * 7));
          columnCount = Math.max(20, totalWeeks);
          
          currentColumnIndex = Math.floor((now.getTime() - baseDate.getTime()) / (this.MS_PER_DAY * 7));
        } else {
          baseDate = new Date(now);
          baseDate.setDate(baseDate.getDate() - (buffer * 7));
          columnCount = 20;
          currentColumnIndex = buffer;
        }
        break;
        
      case Timescale.Month:
        if (minDate && maxDate) {
          const minYearMonth = (minDate!.getFullYear() * 12) + minDate!.getMonth() - buffer;
          const maxYearMonth = (maxDate!.getFullYear() * 12) + maxDate!.getMonth() + buffer;
          
          baseDate = new Date();
          baseDate.setFullYear(Math.floor(minYearMonth / 12));
          baseDate.setMonth(minYearMonth % 12);
          baseDate.setDate(1);
          
          columnCount = Math.max(12, maxYearMonth - minYearMonth + 1);
          
          const nowYearMonth = (now.getFullYear() * 12) + now.getMonth();
          currentColumnIndex = nowYearMonth - minYearMonth;
        } else {
          baseDate = new Date(now.getFullYear(), now.getMonth() - buffer, 1);
          columnCount = 12;
          currentColumnIndex = buffer;
        }
        break;
        
      default:
        baseDate = new Date();
        columnCount = 30;
        currentColumnIndex = 0;
    }
    
    this.baseDate.set(baseDate);
    this.columnCount.set(columnCount);
    
    // Scroll to current period after DOM is ready
    requestAnimationFrame(() => {
      this.scrollToColumn(currentColumnIndex);
    });
  }
  
  private scrollToColumn(columnIndex: number): void {
    const scrollContainer = this.scrollElement()?.nativeElement;
    if (scrollContainer) {
      const columnWidth = this.getColumnWidth();
      const scrollPosition = columnIndex * columnWidth;
      scrollContainer.scrollLeft = scrollPosition;
    }
  }

  private getColumnWidth(): number {
    switch (this.timescale()) {
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

  private parseIsoDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDateForColumn(index: number): DateColumn {
    const base = this.baseDate();
    let date: Date;
    let label: string;

    switch (this.timescale()) {
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
    const scrollContainer = this.scrollElement()?.nativeElement;
    if (!scrollContainer) return;

    // Check if mouse is over a task or work center overlay
    const target = event.target as HTMLElement;
    if (this.isOverTaskOrOverlay(target)) {
      this.showHoverEffect.set(false);
      return;
    }

    const scrollRect = scrollContainer.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft || 0;

    // Calculate mouse position relative to scroll container viewport
    const x = event.clientX - scrollRect.left;
    const y = event.clientY - scrollRect.top;

    // Adjust for header height to align with interaction pane coordinate system
    const adjustedY = y - this.HEADER_HEIGHT;

    if (adjustedY < 0) {
      this.showHoverEffect.set(false);
      return;
    }

    this.mouseX.set(x);
    this.mouseY.set(adjustedY);
    this.showHoverEffect.set(true);

    // Determine which work center row we're hovering over
    const workCenterIndex = Math.floor(adjustedY / this.ROW_HEIGHT);
    const workCenters = this.workCenters();
    if (workCenterIndex >= 0 && workCenterIndex < workCenters.length) {
      this.hoveredWorkCenterId.set(workCenters[workCenterIndex].docId);
    } else {
      this.hoveredWorkCenterId.set(null);
    }
  }

  onMouseLeave(): void {
    this.showHoverEffect.set(false);
    this.hoveredWorkCenterId.set(null);
  }

  onClick(event: MouseEvent): void {
    // Check if click is on a task or work center overlay
    const target = event.target as HTMLElement;
    if (this.isOverTaskOrOverlay(target)) {
      return; // Don't open sidebar if clicking on task or overlay
    }

    // Clear any previous error
    this.errorMessage.set('');

    const scrollContainer = this.scrollElement()?.nativeElement;
    if (!scrollContainer) return;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft || 0;

    const x = event.clientX - scrollRect.left;
    const y = event.clientY - scrollRect.top;

    // Adjust for header height
    const adjustedY = y - this.HEADER_HEIGHT;

    if (adjustedY < 0) return;

    const workCenterIndex = Math.floor(adjustedY / this.ROW_HEIGHT);
    const workCenters = this.workCenters();

    if (workCenterIndex >= 0 && workCenterIndex < workCenters.length) {
      const workCenterId = workCenters[workCenterIndex].docId;

      // Calculate start date from mouse position
      const columnWidth = this.getColumnWidth();
      const totalX = x + scrollLeft;
      const columnIndex = Math.floor(totalX / columnWidth);

      const startDate = this.getDateForColumn(columnIndex).date;

      // Calculate end date as exactly one timescale unit from start
      const endDate = new Date(startDate);
      switch (this.timescale()) {
        case Timescale.Day:
          endDate.setDate(endDate.getDate() + 1);
          break;
        case Timescale.Week:
          endDate.setDate(endDate.getDate() + 7);
          break;
        case Timescale.Month:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        default:
          endDate.setDate(endDate.getDate() + 1);
          break;
      }

      // Open the sidebar with pre-filled dates
      this.selectedWorkOrder.set(undefined);
      this.selectedWorkCenterId.set(workCenterId);
      this.selectedDefaultStartDate.set(this.toIsoDate(startDate));
      this.selectedDefaultEndDate.set(this.toIsoDate(endDate));
      this.showWorkOrderDetails.set(true);
    }
  }

  private isOverTaskOrOverlay(element: HTMLElement): boolean {
    // Check if element or any parent is a task or work center overlay
    let current: HTMLElement | null = element;
    while (current) {
      if (current.classList.contains('task-wrapper') ||
          current.classList.contains('task-card') ||
          current.tagName.toLowerCase() === 'app-task' ||
          current.classList.contains('work-center-overlay') ||
          current.tagName.toLowerCase() === 'app-work-center-overlay') {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  isCurrentPeriod(columnIndex: number): boolean {
    const now = new Date();
    const columnDate = this.getDateForColumn(columnIndex).date;

    switch (this.timescale()) {
      case Timescale.Day:
        return now.getFullYear() === columnDate.getFullYear() &&
               now.getMonth() === columnDate.getMonth() &&
               now.getDate() === columnDate.getDate();
      case Timescale.Week:
        const nowWeek = this.getWeekNumber(now);
        const colWeek = this.getWeekNumber(columnDate);
        return now.getFullYear() === columnDate.getFullYear() && nowWeek === colWeek;
      case Timescale.Month:
        return now.getFullYear() === columnDate.getFullYear() &&
               now.getMonth() === columnDate.getMonth();
      default:
        return false;
    }
  }

  getCurrentPeriodLabel(): string {
    switch (this.timescale()) {
      case Timescale.Day:
        return 'day';
      case Timescale.Week:
        return 'week';
      case Timescale.Month:
        return 'month';
      default:
        return '';
    }
  }

  onCloseDetails(): void {
    this.showWorkOrderDetails.set(false);
    this.selectedWorkOrder.set(undefined);
    this.selectedWorkCenterId.set(undefined);
    this.selectedDefaultStartDate.set(undefined);
    this.selectedDefaultEndDate.set(undefined);
  }

  onEditWorkOrder(workOrder: WorkOrderDocument): void {
    this.selectedWorkOrder.set(workOrder);
    this.selectedWorkCenterId.set(workOrder.data.workCenterId);
    this.selectedDefaultStartDate.set(undefined);
    this.selectedDefaultEndDate.set(undefined);
    this.showWorkOrderDetails.set(true);
  }

  onDeleteWorkOrder(workOrder: WorkOrderDocument): void {
    if (confirm('Are you sure you want to delete this work order?')) {
      this.workOrderService.deleteWorkOrder(workOrder.docId);
    }
  }

  getWorkOrdersForWorkCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workOrders().filter(order => order.data.workCenterId === workCenterId);
  }

  changeTimescale(timescale: Timescale): void {
    this.timescale.set(timescale);
  }

  // Position calculation methods
  getWorkCenterRowTop(workCenterIndex: number): number {
    return workCenterIndex * this.ROW_HEIGHT;
  }

  getRowHoverTop(): number {
    const workCenterIndex = Math.floor(this.mouseY() / this.ROW_HEIGHT);
    return workCenterIndex * this.ROW_HEIGHT;
  }

  getMouseHoverTop(): number {
    const workCenterIndex = Math.floor(this.mouseY() / this.ROW_HEIGHT);
    return workCenterIndex * this.ROW_HEIGHT + this.ROW_HEIGHT / 2;
  }

  getTaskLeft(workOrder: WorkOrderDocument): number {
    const baseDate = this.baseDate();
    const startDate = this.parseIsoDate(workOrder.data.startDate);
    const columnWidth = this.getColumnWidth();

    let offset: number; // Offset in fractional units (can be decimal)
    switch (this.timescale()) {
      case Timescale.Day:
        offset = (startDate.getTime() - baseDate.getTime()) / this.MS_PER_DAY;
        break;
      case Timescale.Week:
        offset = (startDate.getTime() - baseDate.getTime()) / (this.MS_PER_DAY * 7);
        break;
      case Timescale.Month:
        // Calculate month offset with fractional part for day within month
        const yearsDiff = startDate.getFullYear() - baseDate.getFullYear();
        const monthsDiff = startDate.getMonth() - baseDate.getMonth();
        const totalMonthsDiff = yearsDiff * 12 + monthsDiff;
        
        // Calculate fractional month based on day of month
        const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        const dayFraction = (startDate.getDate() - 1) / daysInStartMonth;
        
        offset = totalMonthsDiff + dayFraction;
        break;
      default:
        offset = 0;
    }

    return Math.max(0, offset * columnWidth);
  }

  getTaskWidth(workOrder: WorkOrderDocument): number {
    const startDate = this.parseIsoDate(workOrder.data.startDate);
    const endDate = this.parseIsoDate(workOrder.data.endDate);
    const columnWidth = this.getColumnWidth();

    let duration: number; // Duration in fractional units (can be decimal)
    switch (this.timescale()) {
      case Timescale.Day:
        duration = (endDate.getTime() - startDate.getTime()) / this.MS_PER_DAY;
        break;
      case Timescale.Week:
        duration = (endDate.getTime() - startDate.getTime()) / (this.MS_PER_DAY * 7);
        break;
      case Timescale.Month:
        // Calculate month duration with fractional parts
        const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
        const monthsDiff = endDate.getMonth() - startDate.getMonth();
        const totalMonthsDiff = yearsDiff * 12 + monthsDiff;
        
        // Calculate fractional parts for start and end
        const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        const daysInEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        
        const startDayFraction = (startDate.getDate() - 1) / daysInStartMonth;
        const endDayFraction = (endDate.getDate() - 1) / daysInEndMonth;
        
        duration = totalMonthsDiff + endDayFraction - startDayFraction;
        break;
      default:
        duration = 1;
    }

    // Return actual duration without minimum clamping
    return Math.max(1, duration * columnWidth); // At least 1px to be visible
  }

  readonly Timescale = Timescale;
}

