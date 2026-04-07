import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-edit-rejected',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-rejected.component.html',
  styleUrls: ['./edit-rejected.component.css']
})
export class EditRejectedComponent implements OnInit {
  customerForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  pendingRequestId: string | null = null;
  loading = true;

  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      customerNo: [''],
      name: ['', Validators.required],
      companyName: [''],
      dob: ['', Validators.required],
      idNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      homeAddress: ['', Validators.required],
      annualIncome: ['', Validators.required],
      employerName: ['', Validators.required],
    });

    this.pendingRequestId = this.route.snapshot.paramMap.get('id');

    // Try to load from router state (passed from customers page)
    const stateData = history.state?.requestData;
    if (stateData) {
      this.customerForm.patchValue(stateData);
      this.loading = false;
    } else if (this.pendingRequestId) {
      // Fallback: fetch the pending request directly
      this.http.get<any[]>(this.pendingUrl, { withCredentials: true }).subscribe({
        next: (data) => {
          const req = data.find(r => String(r.id) === this.pendingRequestId);
          if (req) {
            try {
              const payload = JSON.parse(req.payload);
              this.customerForm.patchValue(payload);
            } catch (e) {}
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading pending request:', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  onResubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    // Embed the originalRequestId so the backend can delete it on approval
    const payload = {
      ...this.customerForm.value,
      originalRequestId: this.pendingRequestId ? Number(this.pendingRequestId) : null
    };

    const pendingRequest = {
      entityType: 'CUSTOMER',
      operation: 'CREATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer update request resubmitted for manager approval.';
        this.showMessageModal = true;
      },
      error: (err) => console.error('Error resubmitting request:', err)
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
