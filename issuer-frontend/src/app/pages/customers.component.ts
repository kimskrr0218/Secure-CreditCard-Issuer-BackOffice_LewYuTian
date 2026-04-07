import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TopNavbarComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }


  customers: any[] = [];
  filteredCustomers: any[] = [];
  rejectedCustomers: any[] = [];
  pendingRequests: any[] = [];

  // Tab state
  activeTab: string = 'live';

  // Filters state
  filterCustNo: string = '';
  filterEmail: string = '';
  filterName: string = '';

  customerForm!: FormGroup;

  isEditing = false;
  editId: number | null = null;
  loading = true;

  showModal = false;
  showViewModal = false;
  selectedCustomer: any = null;

  showRequestModal = false;
  selectedRequest: any = null;

  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  showConfirmDeleteModal = false;
  pendingDeleteId: number | null = null;

  private apiUrl = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {

    this.customerForm = this.fb.group({
      customerNo: [''],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.loadCustomers();
  }

  // ================= LOAD CUSTOMERS =================

  loadCustomers(): void {

    this.loading = true;

    // 1. Fetch Live Customers
    this.http.get<any[]>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.customers = data;
        this.filteredCustomers = [...this.customers];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.loading = false;
      }
    });

    // 2. Fetch Pending / Rejected Requests
    this.http.get<any[]>(this.pendingUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        // Filter only Customer requests
        const customerRequests = data
          .filter(req => req.entityType === 'CUSTOMER')
          .map(req => {
            // Parse the JSON payload to extract customer fields so the HTML can display them nicely
            let payloadObj: any = {};
            try {
              payloadObj = JSON.parse(req.payload);
            } catch (e) {}

            return {
              ...req,
              ...payloadObj, // Bring in all fields like email, etc.
              pendingRequestId: req.id, // Protect the pending request ID in case payload overwrites it
              customerNo: payloadObj.customerNo || 'N/A',
              name: payloadObj.name || 'Unknown',
              maker: req.createdBy || 'STAFF', // fallback if backend doesn't have createdBy
              submittedDate: req.createdAt || new Date().toISOString().split('T')[0],
              status: req.status || 'PENDING', // Ensures state reads 'PENDING' or 'REJECTED' instead of undefined
              reason: req.rejectionReason || req.reason || req.rejectReason || 'No reason provided'
            };
          });

        this.pendingRequests = customerRequests.filter(req => req.status === 'PENDING');
        this.rejectedCustomers = customerRequests.filter(req => req.status === 'REJECTED');
      },
      error: (err) => console.error('Error loading pending requests:', err)
    });

  }

  // ================= FILTERS =================

  applyFilters(): void {
    this.filteredCustomers = this.customers.filter(c => {
      const custNo = this.filterCustNo.trim().toLowerCase();
      const email = this.filterEmail.trim().toLowerCase();
      const name = this.filterName.trim().toLowerCase();

      if (custNo && !(c.customerNo && c.customerNo.toString().toLowerCase().includes(custNo))) return false;
      if (email && !(c.email && c.email.toLowerCase().includes(email))) return false;
      if (name && !(c.name && c.name.toLowerCase().includes(name))) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.filterCustNo = '';
    this.filterEmail = '';
    this.filterName = '';
    this.applyFilters();
  }

  // ================= CREATE / UPDATE =================

  onSubmit(): void {

    if (this.customerForm.invalid) return;

    const formData = this.customerForm.value;
    const role = localStorage.getItem('role');

    const payload: any = {
      customerNo: formData.customerNo,
      name: formData.name,
      email: formData.email
    };

    if (this.isEditing && this.editId !== null) {
      payload.id = this.editId;
    }

    // ===== STAFF → Pending Request =====

    if (role === 'STAFF') {

      const pendingRequest = {
        entityType: 'CUSTOMER',
        operation: this.isEditing ? 'UPDATE' : 'CREATE',
        payload: JSON.stringify(payload)
      };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = '✅ Request submitted for approval.';
          this.showMessageModal = true;
          this.closeModal();
          this.loadCustomers(); // Refresh the tables to show the new pending request
        },
        error: (err) => console.error('Error submitting request:', err)        
      });
      return;
    }

    // ===== MANAGER / ADMIN → Direct CRUD =====

    if (this.isEditing && this.editId !== null) {

      this.http.put(`${this.apiUrl}/${this.editId}`, payload).subscribe({
        next: () => {
          this.modalMessage = '✅ Customer updated successfully.';
          this.showMessageModal = true;
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => console.error('Error updating customer:', err)
      });

    } else {

      this.http.post(this.apiUrl, payload, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = '✅ Customer created successfully.';
          this.showMessageModal = true;
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => console.error('Error creating customer:', err)
      });

    }

  }

  // ================= EDIT =================

  edit(customer: any): void {
    if (customer && customer.id) {
      this.router.navigate(['/customers/edit', customer.id]);
    }
  }

  // ================= DELETE =================

  delete(id: number): void {
    this.pendingDeleteId = id;
    this.showConfirmDeleteModal = true;
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId;
    if (!id) return;

    this.showConfirmDeleteModal = false;
    this.pendingDeleteId = null;

    const role = localStorage.getItem('role');

    // ===== STAFF → Pending Delete =====

    if (role === 'STAFF') {

      const pendingRequest = {
        entityType: 'CUSTOMER',
        operation: 'DELETE',
        payload: JSON.stringify({ id })
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => { this.modalMessage = '🕓 Delete request submitted for approval.'; this.showMessageModal = true; },
        error: (err) => console.error('Error submitting delete request:', err)
      });

      return;
    }

    // ===== MANAGER / ADMIN → Direct Delete =====

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer deleted successfully.';
          this.showMessageModal = true;
        this.loadCustomers();
      },
      error: (err) => console.error('Error deleting customer:', err)
    });
  }

  cancelDelete(): void {
    this.showConfirmDeleteModal = false;
    this.pendingDeleteId = null;
  }

  // ================= DEACTIVATE / ACTIVATE =================

  deactivate(customer: any) {
    const request = {
      entityType: "CUSTOMER",
      operation: "DEACTIVATE",
      payload: JSON.stringify({ id: customer.id })
    };

    this.http.post('/api/pending', request, { withCredentials: true })
      .subscribe(() => {
        this.modalMessage = "Deactivate request submitted for approval";
          this.showMessageModal = true;
        this.loadCustomers();
      });
  }

  activate(customer: any) {
    const request = {
      entityType: "CUSTOMER",
      operation: "ACTIVATE",
      payload: JSON.stringify({ id: customer.id })
    };

    this.http.post('/api/pending', request, { withCredentials: true })
      .subscribe(() => {
        this.modalMessage = "Activate request submitted for approval";
          this.showMessageModal = true;
        this.loadCustomers();
      });
  }  // ================= MODAL LOGIC =================
  view(customer: any): void {
    if (customer && customer.id) {
      this.router.navigate(['/customers/view', customer.id]);
    } else {
      this.selectedCustomer = customer;
      this.showViewModal = true;
    }
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedCustomer = null;
  }

  viewRequest(request: any): void {
    const id = request.entityId || request.pendingRequestId || request.id;
    this.router.navigate(['/customers/view', id], {
      state: {
        customer: request,
        requestStatus: request.status,
        rejectionReason: request.reason || request.rejectionReason || 'No reason provided'
      }
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.selectedRequest = null;
  }

  editRequest(request: any): void {
    const pendingId = request.pendingRequestId || request.id;

    // Pass the full request data in router state so the edit page can pre-fill the form
    this.router.navigate(['/customers/edit-rejected', pendingId], {
      state: {
        requestData: {
          customerNo: request.customerNo,
          name: request.name,
          companyName: request.companyName,
          dob: request.dob,
          idNumber: request.idNumber,
          email: request.email,
          phoneNumber: request.phoneNumber,
          homeAddress: request.homeAddress,
          annualIncome: request.annualIncome,
          employerName: request.employerName
        }
      }
    });
  }

  openCreateCustomer(): void {
    this.router.navigate(['/customers/add']);
  }

  closeModal(): void {

    this.showModal = false;
    this.customerForm.reset();
    this.isEditing = false;
    this.editId = null;

  }

}
