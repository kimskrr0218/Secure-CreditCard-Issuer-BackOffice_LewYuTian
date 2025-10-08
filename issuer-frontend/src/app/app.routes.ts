import { Routes } from '@angular/router';

import { CustomersComponent } from './pages/customers.component';
import { AccountsComponent } from './pages/accounts.component';
import { CardsComponent } from './pages/cards.component';
import { RolesComponent } from './pages/roles.component';
import { DashboardComponent } from './pages/dashboard.component';
import { LoginComponent } from './pages/login.component';
import { PendingComponent } from './pages/pending.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Staff Dashboard
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { role: 'STAFF' } },
  { path: 'customers', component: CustomersComponent, canActivate: [authGuard], data: { role: 'STAFF' } },
  { path: 'accounts', component: AccountsComponent, canActivate: [authGuard], data: { role: 'STAFF' } },
  { path: 'cards', component: CardsComponent, canActivate: [authGuard], data: { role: 'STAFF' } },

  // Manager Dashboard/sharing with staff
  {
    path: 'pending',
    component: PendingComponent,
    canActivate: [authGuard],
    data: { role: 'MANAGER' }   // allow both 
  },

  // Admin Dashboard
  { path: 'roles', component: RolesComponent, canActivate: [authGuard], data: { role: 'ADMIN' } },

  { path: '**', redirectTo: 'login' }
];