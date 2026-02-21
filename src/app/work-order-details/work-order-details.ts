import { Component, EventEmitter, Output, Input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkOrderDocument, WorkOrderStatus } from '../models/work-order.model';
import { WorkOrderService } from '../services/work-order.service';

@Component({
  selector: 'app-work-order-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './work-order-details.html',
  styleUrl: './work-order-details.scss',
})
export class WorkOrderDetails {
  @Input() workOrder?: WorkOrderDocument;
  @Input() workCenterId?: string;
  @Input() defaultStartDate?: string;
  @Input() defaultEndDate?: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<WorkOrderDocument>();

  private workOrderService = inject(WorkOrderService);

  name = signal('');
  status = signal<WorkOrderStatus>(WorkOrderStatus.Open);
  startDate = signal('');
  endDate = signal('');

  readonly statuses = Object.values(WorkOrderStatus);

  constructor() {
    effect(() => {
      if (this.workOrder) {
        this.name.set(this.workOrder.data.name);
        this.status.set(this.workOrder.data.status);
        this.startDate.set(this.workOrder.data.startDate);
        this.endDate.set(this.workOrder.data.endDate);
      } else {
        this.name.set('');
        this.status.set(WorkOrderStatus.Open);
        this.startDate.set(this.defaultStartDate ?? '');
        this.endDate.set(this.defaultEndDate ?? '');
      }
    });
  }

  onCancel(): void {
    this.close.emit();
  }

  onSave(): void {
    if (!this.name() || !this.startDate() || !this.endDate()) {
      return;
    }

    const workCenterId = this.workCenterId || this.workOrder?.data.workCenterId;
    if (!workCenterId) {
      return;
    }

    // Check for overlap
    const hasOverlap = this.workOrderService.hasOverlap(
      workCenterId,
      this.startDate(),
      this.endDate(),
      this.workOrder?.docId
    );

    if (hasOverlap) {
      alert('This work order overlaps with an existing work order for this work center.');
      return;
    }

    if (this.workOrder) {
      // Update existing
      this.workOrderService.updateWorkOrder(this.workOrder.docId, {
        name: this.name(),
        status: this.status(),
        startDate: this.startDate(),
        endDate: this.endDate(),
      });
    } else {
      // Create new
      const newWorkOrder = this.workOrderService.addWorkOrder({
        workCenterId,
        name: this.name(),
        status: this.status(),
        startDate: this.startDate(),
        endDate: this.endDate(),
      });
      this.save.emit(newWorkOrder);
    }

    this.close.emit();
  }
}
