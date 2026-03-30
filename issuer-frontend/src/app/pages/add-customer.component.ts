import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { NATIONALITIES } from '../constants/nationalities';

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './add-customer.component.html',
  styleUrls: ['./add-customer.component.css']
})
export class AddCustomerComponent implements OnInit {
  customerForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  readonly nationalities = NATIONALITIES;

  private apiUrl = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      // Personal Information
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      companyName: [''],
      dob: ['', Validators.required],
      idNumber: ['', Validators.required],
      
      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],

      // Address Information
      homeAddress: ['', Validators.required],

      // Financial Information
      annualIncome: ['', Validators.required],
      employerName: ['', Validators.required],
      employmentStatus: ['', Validators.required],

      // System Information
      organization: ['', Validators.required],
      currency: ['', Validators.required],
      type: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const payload = this.customerForm.value;
    // Derive 'name' from firstName + lastName for backward compatibility
    payload.name = `${payload.firstName} ${payload.lastName}`.trim();
    const role = localStorage.getItem('role');

    if (role === 'STAFF') {
      const pendingRequest = {
        entityType: 'CUSTOMER',
        operation: 'CREATE',
        payload: JSON.stringify(payload)
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = '✅ Request submitted for approval.';
          this.showMessageModal = true;
        },
        error: (err) => console.error('Error submitting request:', err)
      });
      return;
    }

    // Direct CRUD for Manager/Admin
    this.http.post(this.apiUrl, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer created successfully.';
        this.showMessageModal = true;
      },
        error: (err) => console.error('Error creating customer:', err)
    });
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    this.router.navigate(['/customers']);
  }
}
