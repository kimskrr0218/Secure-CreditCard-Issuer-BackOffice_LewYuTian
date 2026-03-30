import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {

  const router = inject(Router);
  const role = localStorage.getItem('role');

  // Not logged in
  if (!role) {
    router.navigate(['/login']);
    return false;
  }

  const allowedRoles = route.data['roles'] as string[];

  // If no roles specified → just allow
  if (!allowedRoles) {
    return true;
  }

  // If role is allowed
  if (allowedRoles.includes(role)) {
    return true;
  }

  alert('Access Denied!');
  router.navigate(['/dashboard']);
  return false;
};