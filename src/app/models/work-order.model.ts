export enum WorkOrderStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Complete = 'Complete',
  Blocked = 'Blocked',
}

export interface Client {
  id: string;
  name: string;
}

export interface WorkOrder {
  id: string;
  clientId: string;
  name: string;
  status: WorkOrderStatus;
  startDate: Date;
  endDate: Date;
}
