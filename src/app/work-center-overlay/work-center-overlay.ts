import { Component, inject } from '@angular/core';
import { WorkOrderService } from '../services/work-order.service';

@Component({
  selector: 'app-work-center-overlay',
  imports: [],
  templateUrl: './work-center-overlay.html',
  styleUrl: './work-center-overlay.scss',
})
export class WorkCenterOverlay {
  private workOrderService = inject(WorkOrderService);
  workCenters = this.workOrderService.getWorkCenters();
}
