import { Component, EventEmitter, Output, Input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkOrder, WorkOrderStatus } from '../models/work-order.model';
import { WorkOrderService } from '../services/work-order.service';

@Component({
  selector: 'app-work-order-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './work-order-details.html',
  styleUrl: './work-order-details.scss',
})
export class WorkOrderDetails {
  @Input() workOrder?: WorkOrder;
  @Input() workCenterId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<WorkOrder>();

  private workOrderService = inject(WorkOrderService);

  name = signal('');
  status = signal<WorkOrderStatus>(WorkOrderStatus.Open);
  startDate = signal('');
  endDate = signal('');

  readonly statuses = Object.values(WorkOrderStatus);

  constructor() {
    effect(() => {
      if (this.workOrder) {
        this.name.set(this.workOrder.name);
        this.status.set(this.workOrder.status);
        this.startDate.set(this.formatDateForInput(this.workOrder.startDate));
        this.endDate.set(this.formatDateForInput(this.workOrder.endDate));
      } else {
        this.name.set('');
        this.status.set(WorkOrderStatus.Open);
        this.startDate.set('');
        this.endDate.set('');
      }
    });
  }

  private formatDateForInput(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}.${day}.${year}`;
  }

  private parseDateFromInput(dateStr: string): Date {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  }

  onCancel(): void {
    this.close.emit();
  }

  onSave(): void {
    if (!this.name() || !this.startDate() || !this.endDate()) {
      return;
    }

    const startDateObj = this.parseDateFromInput(this.startDate());
    const endDateObj = this.parseDateFromInput(this.endDate());

    const workCenterId = this.workCenterId || this.workOrder?.workCenterId;
    if (!workCenterId) {
      return;
    }

    // Check for overlap
    const hasOverlap = this.workOrderService.hasOverlap(
      workCenterId,
      startDateObj,
      endDateObj,
      this.workOrder?.id
    );

    if (hasOverlap) {
      alert('This work order overlaps with an existing work order for this work center.');
      return;
    }

    if (this.workOrder) {
      // Update existing
      this.workOrderService.updateWorkOrder(this.workOrder.id, {
        name: this.name(),
        status: this.status(),
        startDate: startDateObj,
        endDate: endDateObj,
      });
    } else {
      // Create new
      const newWorkOrder = this.workOrderService.addWorkOrder({
        workCenterId,
        name: this.name(),
        status: this.status(),
        startDate: startDateObj,
        endDate: endDateObj,
      });
      this.save.emit(newWorkOrder);
    }

    this.close.emit();
  }
}
