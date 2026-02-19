import { Component, computed, inject } from '@angular/core';
import { WorkOrderService } from '../services/work-order.service';

@Component({
  selector: 'app-customer-overlay',
  imports: [],
  templateUrl: './customer-overlay.html',
  styleUrl: './customer-overlay.scss',
})
export class CustomerOverlay {
  private workOrderService = inject(WorkOrderService);
  clients = this.workOrderService.getClients();
}
