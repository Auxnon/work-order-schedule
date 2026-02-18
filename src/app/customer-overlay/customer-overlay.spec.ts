import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerOverlay } from './customer-overlay';

describe('CustomerOverlay', () => {
  let component: CustomerOverlay;
  let fixture: ComponentFixture<CustomerOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerOverlay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerOverlay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
