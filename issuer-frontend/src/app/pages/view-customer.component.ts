import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-customer',
  standalone: true,
  imports: [CommonModule, TopNavbarComponent],
  templateUrl: './view-customer.component.html',
  styleUrls: ['./view-customer.component.css']
})
export class ViewCustomerComponent implements OnInit {
  customer: any = null;
  backLabel: string = 'Back to Customers';
  backPath: string = '/customers';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Detect where we came from
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'pending') {
      this.backLabel = 'Back to Pending Requests';
      this.backPath = '/pending';
    }

    // 1. Check if data was passed in the router state (common for pending requests)
    const stateData = history.state?.customer;

    if (stateData) {
      this.customer = stateData;
      return;
    }

    // 2. Otherwise fetch from the backend via ID
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get(`/api/customers/${id}`, { withCredentials: true }).subscribe({
        next: (data) => this.customer = data,
        error: (err) => console.error('Error fetching customer details', err)
      });
    }
  }

  goBack(): void {
    this.router.navigate([this.backPath]);
  }
}
