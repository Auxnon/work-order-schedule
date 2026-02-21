export enum WorkOrderStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Complete = 'Complete',
  Blocked = 'Blocked',
}

export interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;
  };
}

export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string; // ISO format (e.g., "2025-01-15")
    endDate: string;   // ISO format
  };
}
