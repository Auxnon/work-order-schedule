import { Injectable, signal } from '@angular/core';
import { WorkCenter, WorkOrder, WorkOrderStatus } from '../models/work-order.model';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private readonly workCenters = signal<WorkCenter[]>([
    { id: '1', name: 'Acme Corporation' },
    { id: '2', name: 'TechStart Solutions' },
    { id: '3', name: 'Global Industries' },
    { id: '4', name: 'Innovation Labs' },
    { id: '5', name: 'Enterprise Systems' },
    { id: '6', name: 'Digital Ventures' },
  ]);

  private readonly workOrders = signal<WorkOrder[]>([]);

  getWorkCenters() {
    return this.workCenters.asReadonly();
  }

  getWorkOrders() {
    return this.workOrders.asReadonly();
  }

  addWorkOrder(workOrder: Omit<WorkOrder, 'id'>): WorkOrder {
    const newWorkOrder: WorkOrder = {
      ...workOrder,
      id: crypto.randomUUID(),
    };
    this.workOrders.update((orders) => [...orders, newWorkOrder]);
    return newWorkOrder;
  }

  updateWorkOrder(id: string, updates: Partial<WorkOrder>): void {
    this.workOrders.update((orders) =>
      orders.map((order) => (order.id === id ? { ...order, ...updates } : order))
    );
  }

  deleteWorkOrder(id: string): void {
    this.workOrders.update((orders) => orders.filter((order) => order.id !== id));
  }

  getWorkOrdersForWorkCenter(workCenterId: string): WorkOrder[] {
    return this.workOrders().filter((order) => order.workCenterId === workCenterId);
  }

  hasOverlap(workCenterId: string, startDate: Date, endDate: Date, excludeId?: string): boolean {
    const workCenterOrders = this.getWorkOrdersForWorkCenter(workCenterId).filter(
      (order) => !excludeId || order.id !== excludeId
    );

    return workCenterOrders.some((order) => {
      return startDate < order.endDate && endDate > order.startDate;
    });
  }
}
