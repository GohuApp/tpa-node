import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Signature } from '../_models/signature.model';
import { Parent } from '../_models/parent.model';
import { Attachment } from '../_models/attachment.model';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignatureService {

    constructor(protected http: HttpClient) { }

    ///"/signatures/{id}/sign"
    newInstance(redirectUri: string): Observable<string> {
        const form = new FormData();
        form.append('type', 'signature');
        form.append('response_type', 'code');
        form.append('redirect_uri', redirectUri);

        return this.http.post(environment.endPoint + '/registers', form, { observe: 'response' }).pipe(
            map(
                res => {
                    return '' + res.headers.get('Location');
                }
            )
        );
    }

    ///signatures/{id}
    getOne(id: string): Observable<Signature> {

        return this.http.get(environment.endPoint + '/signatures/' + id).pipe(
            map(
                res => {
                    res['signedAt'] = new Date(res['signedAt']);

                    for (let i = 0; i < res['parents'].length; i++) {
                        res['parents'][i]['createdAt'] = res['parents'][i]['createdAt'] ? new Date(res['parents'][i]['createdAt']) : null;
                        res['parents'][i]['consolidatedAt'] = res['parents'][i]['consolidatedAt'] ? new Date(res['parents'][i]['consolidatedAt']) : null;
                        res['parents'][i]['signedAt'] = res['parents'][i]['signedAt'] ? new Date(res['parents'][i]['signedAt']) : null;

                        res['parents'][i] = Object.assign(new Parent(), res['parents'][i]);
                    }

                    for (let i = 0; i < res['attachments'].length; i++) {
                        res['attachments'][i] = Object.assign(new Attachment(), res['attachments'][i]);
                        res['attachments'][i].url = environment.endPoint + '/signatures/' + id + '/attachment/' + res['attachments'][i].id;
                    }

                    return Object.assign(new Signature(), res);
                }
            )
        );
    }

    ///signatures/{id}/xml
    getAttachment(id: string, aid: string): Observable<Blob> {

        return this.http.get(environment.endPoint + '/signatures/' + id + '/attachment/' + aid, { responseType: 'blob', observe: 'response' }).pipe(
            map(
                (result: HttpResponse<Blob>) => {
                    return result.body;
                }
            )
        );
    }

    ///ca/{id}/sms
    requestPIN(id: string) {
        return this.http.post(environment.endPoint + '/ca/' + id + '/sms', null);
    }

    //El form data debe tener CSR y PIN
    requestCertificate(id: string, csr: string, pin: string) {
        const form = new FormData();
        form.append('CSR', csr);
        form.append('PIN', pin);
        return this.http.post(environment.endPoint + '/ca/crt/' + id, form, { responseType: 'blob' });
    }

    ///"/signatures/{id}/sign"
    sign(id: string, signature: string) {
        const form = new FormData();
        form.append('signature', signature);
        return this.http.post(environment.endPoint + '/signatures/' + id + '/sign', form);
    }


    tsa(data: any) {
        let headers = new HttpHeaders();
        headers = headers.set('Accept', 'application/timestamp-reply');
        headers = headers.set('Content-Type', 'application/timestamp-query');

        return this.http.post(environment.endPoint + '/tsa', data.buffer, { responseType: 'blob', headers: headers });
    }

    ocsp(data: any) {
        let headers = new HttpHeaders();
        headers = headers.set('Accept', 'application/ocsp-response');
        headers = headers.set('Content-Type', 'application/ocsp-request');

        return this.http.post(environment.endPoint + '/ca/ocsp', data.buffer, { responseType: 'blob', headers: headers });
    }
}

