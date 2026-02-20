export enum WorkOrderStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Complete = 'Complete',
  Blocked = 'Blocked',
}

export interface WorkCenter {
  id: string;
  name: string;
}

export interface WorkOrder {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDate: Date;
  endDate: Date;
}
