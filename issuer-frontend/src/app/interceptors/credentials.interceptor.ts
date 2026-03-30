import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP Interceptor that adds withCredentials: true to all requests.
 * This is required for session-based authentication (JSESSIONID) to work
 * when the frontend and backend are on different origins.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedRequest = req.clone({
    withCredentials: true
  });
  return next(clonedRequest);
};
