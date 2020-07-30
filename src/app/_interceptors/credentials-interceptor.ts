
import { Observable } from 'rxjs';
import { HttpRequest, HttpInterceptor, HttpHandler, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (request.withCredentials === undefined || request.withCredentials === false) {
            
            request = request.clone({
                withCredentials: true,
            });
        }

        return next.handle(request);
    }
}