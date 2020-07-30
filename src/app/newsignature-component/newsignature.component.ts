import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { SignatureService } from '../_services/signature.service';
import { environment } from '../../environments/environment';


@Component({
    selector: 'app-new-signature',
    templateUrl: 'newsignature.component.html',
    styleUrls: []
})
export class NewSignatureComponent implements OnInit, OnDestroy, AfterViewInit {
    public redirectUri: string;
    private paramsObserver$;
    public action;
    
   @ViewChild('theForm', {static: false})
   private form: ElementRef;

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

    ngAfterViewInit(){
        this.form.nativeElement.submit();
    }

    ngOnDestroy(): void {
        this.paramsObserver$.unsubscribe();
    }
}
