import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-add-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './add-card.component.html',
  styleUrls: ['./add-card.component.css']
})
export class AddCardComponent implements OnInit {
  cardForm!: FormGroup;
  accounts: any[] = [];
  isSubmitting = false;
  isLoadingAccounts = true;

  // Auto-derived readonly display
  customerDisplay = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAccounts();

    // Auto-derive customer when account changes
    this.cardForm.get('accountId')?.valueChanges.subscribe(accountId => {
      const account = this.accounts.find(a => a.id === Number(accountId));
      if (account && account.customer) {
        this.customerDisplay = `${account.customer.customerNo} - ${account.customer.name}`;
        this.cardForm.patchValue({ cardHolderName: account.customer.name });
      } else {
        this.customerDisplay = '';
        this.cardForm.patchValue({ cardHolderName: '' });
      }
    });
  }

  initForm(): void {
    this.cardForm = this.fb.group({
      accountId: ['', Validators.required],
      cardType: ['', Validators.required],
      cardBrand: ['', Validators.required],
      cardMode: ['PHYSICAL', Validators.required],
      cardHolderName: ['', Validators.required]
    });
  }

  loadAccounts(): void {
    this.http.get<any[]>('http://localhost:8080/api/accounts', { withCredentials: true }).subscribe({
      next: (data) => {
        this.accounts = data.filter(a => a.status === 'ACTIVE');
        this.isLoadingAccounts = false;
      },
      error: (err) => {
        console.error('Error fetching accounts', err);
        this.isLoadingAccounts = false;
      }
    });
  }

  onSubmit(): void {
    if (this.cardForm.invalid) {
      Object.keys(this.cardForm.controls).forEach(key => {
        this.cardForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.cardForm.value;

    const reqPayload = {
      entityType: 'CARD',
      operation: 'CREATE',
      payload: JSON.stringify({
        accountId: formValue.accountId,
        cardType: formValue.cardType,
        cardBrand: formValue.cardBrand,
        cardMode: formValue.cardMode,
        cardHolderName: formValue.cardHolderName
      })
    };

    this.http.post('http://localhost:8080/api/pending', reqPayload, { withCredentials: true }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.modalService.alert('Card Request Submitted for Approval.');
        setTimeout(() => this.router.navigate(['/cards']), 1500);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
        this.modalService.alert('Failed to submit request.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/cards']);
  }
}
