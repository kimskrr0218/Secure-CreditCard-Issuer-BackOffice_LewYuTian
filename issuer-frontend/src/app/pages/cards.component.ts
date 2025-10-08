import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CardService, Card } from '../services/card.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.css']
})
export class CardsComponent implements OnInit {
  cards: Card[] = [];
  accounts: any[] = [];
  cardForm!: FormGroup;
  isEditing = false;
  editId: number | null = null;
  loading = true;

  private apiUrl = 'http://localhost:8080/api/accounts';

  constructor(
    private fb: FormBuilder,
    private cardService: CardService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cardForm = this.fb.group({
      accountId: ['', Validators.required],
      cardType: ['', Validators.required]
    });

    this.loadCards();
    this.loadAccounts();
  }

  loadCards(): void {
    this.loading = true;
    this.cardService.getAllCards().subscribe({
      next: (data) => {
        this.cards = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading cards:', err);
        this.loading = false;
      }
    });
  }

  loadAccounts(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.accounts = data.filter(acc => acc.status === 'ACTIVE');
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.cardForm.invalid) return;

    const { accountId, cardType } = this.cardForm.value;

    if (this.isEditing && this.editId !== null) {
      this.cardService.update(this.editId, cardType, 'ACTIVE').subscribe(() => {
        alert('Update request submitted for approval.');
        this.cancelEdit();
      });
    } else {
      this.cardService.create(accountId, cardType).subscribe(() => {
        alert('Create request submitted for approval.');
        this.cardForm.reset();
      });
    }
  }

  
  edit(card: Card): void {
    this.isEditing = true;
    this.editId = card.id ?? null;
    this.cardForm.patchValue({
      accountId: card.account?.id,
      cardType: card.cardType
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editId = null;
    this.cardForm.reset();
  }

  delete(id: number): void {
    if (confirm('Are you sure you want to delete this card?')) {
      this.cardService.delete(id).subscribe(() => {
        alert('Delete request submitted for approval.');
      });
    }
  }
}
