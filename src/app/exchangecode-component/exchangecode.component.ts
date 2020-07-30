import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { SignatureService } from '../_services/signature.service';
import { environment } from '../../environments/environment';


@Component({
    selector: 'app-exchangecode',
    templateUrl: 'exchangecode.component.html',
    styleUrls: []
})
export class ExchangeCodeComponent implements OnInit, OnDestroy {
    public redirectUri: string;
    private paramsObserver$;
    public action;
    
   

    constructor(
        private route: ActivatedRoute,
    ) {
        this.action = environment.endPoint + '/registers';
    }

    ngOnInit(): void {
        
        this.paramsObserver$ = this.route.queryParams.subscribe(
            params => {
                this.redirectUri = params.redirect_uri;
            }
        );
        
    }

    ngOnDestroy(): void {
        this.paramsObserver$.unsubscribe();
    }
}
