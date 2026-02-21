import { Injectable, signal } from '@angular/core';
import { WorkCenterDocument, WorkOrderDocument } from '../models/work-order.model';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private readonly workCenters = signal<WorkCenterDocument[]>([
    { docId: '1', docType: 'workCenter', data: { name: 'Acme Corporation' } },
    { docId: '2', docType: 'workCenter', data: { name: 'TechStart Solutions' } },
    { docId: '3', docType: 'workCenter', data: { name: 'Global Industries' } },
    { docId: '4', docType: 'workCenter', data: { name: 'Innovation Labs' } },
    { docId: '5', docType: 'workCenter', data: { name: 'Enterprise Systems' } },
    { docId: '6', docType: 'workCenter', data: { name: 'Digital Ventures' } },
  ]);
  // TODO should be a UUID but a backend should decide this
  idIncrementer = 0;

  private readonly workOrders = signal<WorkOrderDocument[]>([]);

  getWorkCenters() {
    return this.workCenters.asReadonly();
  }

  getWorkOrders() {
    return this.workOrders.asReadonly();
  }

  addWorkOrder(data: WorkOrderDocument['data']): WorkOrderDocument {
    const newWorkOrder: WorkOrderDocument = {
      docId: `${this.idIncrementer}`,
      docType: 'workOrder',
      data,
    };
    this.idIncrementer++;
    this.workOrders.update((orders) => [...orders, newWorkOrder]);
    return newWorkOrder;
  }

  updateWorkOrder(docId: string, updates: Partial<WorkOrderDocument['data']>): void {
    this.workOrders.update((orders) =>
      orders.map((order) =>
        order.docId === docId ? { ...order, data: { ...order.data, ...updates } } : order,
      ),
    );
  }

  deleteWorkOrder(docId: string): void {
    this.workOrders.update((orders) => orders.filter((order) => order.docId !== docId));
  }

  getWorkOrdersForWorkCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workOrders().filter((order) => order.data.workCenterId === workCenterId);
  }

  hasOverlap(workCenterId: string, startDate: string, endDate: string, excludeId?: string): boolean {
    const workCenterOrders = this.getWorkOrdersForWorkCenter(workCenterId).filter(
      (order) => !excludeId || order.docId !== excludeId,
    );

    return workCenterOrders.some((order) => {
      return startDate < order.data.endDate && endDate > order.data.startDate;
    });
  }
}
