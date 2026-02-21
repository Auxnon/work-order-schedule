import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderDocument, WorkCenterDocument } from '../models/work-order.model';

@Component({
  selector: 'app-task',
  imports: [CommonModule],
  templateUrl: './task.html',
  styleUrl: './task.scss',
})
export class Task {
  @Input() workOrder!: WorkOrderDocument;
  @Input() workCenter!: WorkCenterDocument;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  showMenu = signal(false);

  onEdit(): void {
    this.edit.emit();
    this.showMenu.set(false);
  }

  onDelete(): void {
    this.delete.emit();
    this.showMenu.set(false);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu.update(v => !v);
  }

  getStatusClass(): string {
    return this.workOrder.data.status.toLowerCase().replaceAll(' ', '-');
  }
}
