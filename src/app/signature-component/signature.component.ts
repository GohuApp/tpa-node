import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as forge from 'node-forge';
import * as Crypto from 'crypto-browserify';
import * as swal from 'sweetalert2';
import { SignatureService } from '../_services/signature.service';
import { Signature } from '../_models/signature.model';
import { MatButton } from '@angular/material/button';
import SignaturePad from 'signature_pad';
import * as XadesUndesign from 'undersign/xades';
import * as  HadesUndersign from 'undersign';
import * as XmlCore from 'xml-core';
import { environment } from 'src/environments/environment';

// declare var XAdES: any;
declare const Buffer;
declare const MediaRecorder;

export const signPadValidator = (signPad): ValidatorFn => (control: AbstractControl) => {

  if (signPad && !signPad.isEmpty()) {
    return null;
  }
  return { myValidator: { valid: false } };
};

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrls: ['./signature.component.scss']
})
export class SignatureComponent implements OnInit, OnDestroy {
  public id: string;
  public signature: Signature;
  private signatureObserver$;
  private pinObserver$;

  public pinRequested = false;
  public csrRequested = false;
  public signatureSended = false;
  public signatureSuccess = false;
  public showPdfs = false;
  public loadingSubject = new BehaviorSubject<boolean>(true);
  public timeoutPin = new BehaviorSubject<boolean>(false);
  public numAttachmentLoaded = 0;

  public step = 0;
  public isFirefox = false;

  private pubKey;
  private privKey;
  private certificate;
  private signedXml;

  private recordedBlobs;
  private recordedUrl;
  private mediaRecorder;
  private mediaType;

  public handwrittenImage;
  public handwrittenVideo;
  public reportUrl;
  public reportUrlSanitize;
  public reportSanitizePdfViewer;
  public signatureUrl;

  //http://ocspcomp.cert.fnmt.es/ocsp/OcspResponder
//TENGO QUE INCLUIR LOS CERTIFICADOS DE LOS OCSP  (al tener noCheck no hace falta el ocsp)
//EL CERTIFICADO DEL TSA Y LA RESPUESTA OCSP

  private issuer = `-----BEGIN CERTIFICATE-----
  MIIFLzCCBBegAwIBAgIBAjANBgkqhkiG9w0BAQsFADCByDEVMBMGA1UEFAwMKzM0
  NjcyNDUxODU2MRIwEAYDVQQFDAlCNzA1OTAwMTMxGDAWBgNVBGEMD1ZBVEVTLUI3
  MDU5MDAxMzELMAkGA1UEBgwCRVMxEjAQBgNVBAgMCUEgQ29ydcOxYTEPMA0GA1UE
  BwwGRmVycm9sMSEwHwYDVQQKDBhQT1NUQUxMIERJR0lUQUwgQk9YRVMgU0wxETAP
  BgNVBAsMCFRQQSBHT0hVMRkwFwYDVQQDDBBUUEEgR09IVSBDQSBST09UMB4XDTIw
  MDkxNDA5MTkyMVoXDTMwMDkxNDA5MTkyMVowgdAxFTATBgNVBBQMDCszNDY3MjQ1
  MTg1NjESMBAGA1UEBQwJQjcwNTkwMDEzMRgwFgYDVQRhDA9WQVRFUy1CNzA1OTAw
  MTMxCzAJBgNVBAYMAkVTMRIwEAYDVQQIDAlBIENvcnXDsWExDzANBgNVBAcMBkZl
  cnJvbDEhMB8GA1UECgwYUE9TVEFMTCBESUdJVEFMIEJPWEVTIFNMMREwDwYDVQQL
  DAhUUEEgR09IVTEhMB8GA1UEAwwYVFBBIEdPSFUgQ0EgSU5URVJNRURJQVRFMIIB
  IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtFKhoRFrQ0yLoKZBVO3zXKp3
  NsaNUoDILQOiQXAXEgMFyQE5EER3CrTmVp1n1UDuZ4EKUXviJ2xVQX2Xf/ASjvqo
  iFJLO20n2n3//GbbqMnOTOwQvqcXEMnoZ60qrkl15g7pPXADWIdfKKD4h8hoDF7s
  9Mkw59YLlsdavs4ssquXhSEV0Sz/sS35PpNMLGOSX+Iv9D97yUYi8VpnypjFEhp4
  p1umB9my/l+KKGQdOQ9nXuENSoGI8gxu9ck752EQfnt2QCeBHtuZBtlHFEc7e49Q
  zkQa4jsEUsreKt49Uwe2QAfMsDYJQpGnaU/RTdebtMKeHoFEfbh5xzaKNgKrEQID
  AQABo4IBGDCCARQwDgYDVR0PAQH/BAQDAgEGMB8GA1UdIwQYMBaAFLoj9xx40/TO
  OZjoxiShYr9aJMkWMBIGA1UdEwEB/wQIMAYBAf8CAQAwga0GA1UdIASBpTCBojCB
  nwYEVR0gADCBljBmBggrBgEFBQcCAjBaHlhUUEEgR09IVSAoUE9TVEFMTCBESUdJ
  VEFMIEJPWEVTLCBDSUYgQjcwNTkwMDEzKS4gQ1BTIGVuIGh0dHA6Ly90cGEtZG9j
  LmdvaHUuZXMvZHBjcy5odG1sMCwGCCsGAQUFBwIBFiBodHRwOi8vdHBhLWRvYy5n
  b2h1LmVzL2RwY3MuaHRtbDAdBgNVHQ4EFgQUI9daD0VdMwULZk6ZBShN/FPTf6Ew
  DQYJKoZIhvcNAQELBQADggEBAITsNLmMNnO3XvOYf9H8Pn/sLe41Cw+5EDb61xoe
  zPiUWqpd+fs5TL60hRXWdiB+aNCWSzkJAT2sKlgjDOel/U4Vuvu6X8CifZ1OdUC6
  lNYYiuCB4PmZnsuVE96bjoLvtmwvVEEW5WC+NCH7PpAVeHmHJNgNx3Knt7YRUrIh
  Gb5/eWaqG60vTUIacXSdY9fZDEEF7i79c9Nge6ziLFkcDipIigiCmH3zoGofqJ+j
  hh8GMI5EZdu6eyJGTKw2d7dmPimwLecPc2Fc90qU8dq503XW9IJ2SYMP51d3ENMX
  y/IT/lZM8RhDmOytxOHb/gyDVBz20Fui2GGI1BisPK5Tw04=
  -----END CERTIFICATE-----`;

  private root = `-----BEGIN CERTIFICATE-----
  MIIEljCCA36gAwIBAgIBATANBgkqhkiG9w0BAQsFADCByDEVMBMGA1UEFAwMKzM0
  NjcyNDUxODU2MRIwEAYDVQQFDAlCNzA1OTAwMTMxGDAWBgNVBGEMD1ZBVEVTLUI3
  MDU5MDAxMzELMAkGA1UEBgwCRVMxEjAQBgNVBAgMCUEgQ29ydcOxYTEPMA0GA1UE
  BwwGRmVycm9sMSEwHwYDVQQKDBhQT1NUQUxMIERJR0lUQUwgQk9YRVMgU0wxETAP
  BgNVBAsMCFRQQSBHT0hVMRkwFwYDVQQDDBBUUEEgR09IVSBDQSBST09UMCAXDTIw
  MDkxMjEwMjY0MloYDzIwNTAwOTEyMTAyNjQyWjCByDEVMBMGA1UEFAwMKzM0Njcy
  NDUxODU2MRIwEAYDVQQFDAlCNzA1OTAwMTMxGDAWBgNVBGEMD1ZBVEVTLUI3MDU5
  MDAxMzELMAkGA1UEBgwCRVMxEjAQBgNVBAgMCUEgQ29ydcOxYTEPMA0GA1UEBwwG
  RmVycm9sMSEwHwYDVQQKDBhQT1NUQUxMIERJR0lUQUwgQk9YRVMgU0wxETAPBgNV
  BAsMCFRQQSBHT0hVMRkwFwYDVQQDDBBUUEEgR09IVSBDQSBST09UMIIBIjANBgkq
  hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs/ej0x9inPNr6eEZGTCH4j9BmNvW1DpK
  8KSBFHw90sHP3e5NGVNXXJ/DG98rNFf6dvqX0ktKojjR449ttytUuUrkV6HzlWYD
  DKuj1xbdLaesaZ1OOfYkjD1UmVZ8DZ3WjtUTL6olmU5PXM2vrj2FxiHtyU7U1tPJ
  n9ZjqAWGD8E6yeXu9AvjddLaidbz/LO0pRid/NxrUIm+XkQftTIzPAf96XFcyZyl
  mnLqzNXzfON4LpWadCIOgWMhIm27Frp3pPCQsMG+kOSuy+l86SHGsN0IzO4kkspR
  gsLnov9NtBctgXFZ68LBJMN5CpgZoo9xlc7U1DJ82hIxvz7O4q8irwIDAQABo4GG
  MIGDMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8EBTADAQH/MEEGA1UdIAQ6MDgw
  NgYEVR0gADAuMCwGCCsGAQUFBwIBFiBodHRwOi8vdHBhLWRvYy5nb2h1LmVzL2Rw
  Y3MuaHRtbDAdBgNVHQ4EFgQUuiP3HHjT9M45mOjGJKFiv1okyRYwDQYJKoZIhvcN
  AQELBQADggEBAFmtAWj2Zf6H+6NM/wozCNg7pn7ra7L1nq0Tg7z7nq9HBzJVyKI3
  TfqrtJtLWINhYczvMlZXWnSLdSfLmsurxvgIIJ2pPp6W07cb0ucJicXdNxkEyBtb
  GBKZ32CdSWGf+g+1fW8cpS4X8PM0OdqioiOsY9G2XvDjEG1IlLNNPfze16Gj/SGm
  4ug85gzoIfAfsh/soiiUjLSxE67iSMDlqLW25o2YMQ23AmQG0a7h9C/QMYiQYjzy
  XnT5IWQTMr9BL/G54zUhqXo/R66TgQQoFFAy6a2lmuV/3pd9DATrleAY6VJYZoPu
  ASp6bVLqTEQepjmt8OVBiBCM0ob7PPMlhjc=
  -----END CERTIFICATE-----`;

  private $ocsp=`-----BEGIN CERTIFICATE-----
  MIIFLzCCBBegAwIBAgIBAjANBgkqhkiG9w0BAQsFADCByDEVMBMGA1UEFAwMKzM0
  NjcyNDUxODU2MRIwEAYDVQQFDAlCNzA1OTAwMTMxGDAWBgNVBGEMD1ZBVEVTLUI3
  MDU5MDAxMzELMAkGA1UEBgwCRVMxEjAQBgNVBAgMCUEgQ29ydcOxYTEPMA0GA1UE
  BwwGRmVycm9sMSEwHwYDVQQKDBhQT1NUQUxMIERJR0lUQUwgQk9YRVMgU0wxETAP
  BgNVBAsMCFRQQSBHT0hVMRkwFwYDVQQDDBBUUEEgR09IVSBDQSBST09UMB4XDTIw
  MDkxNDA5MTkyMVoXDTMwMDkxNDA5MTkyMVowgdAxFTATBgNVBBQMDCszNDY3MjQ1
  MTg1NjESMBAGA1UEBQwJQjcwNTkwMDEzMRgwFgYDVQRhDA9WQVRFUy1CNzA1OTAw
  MTMxCzAJBgNVBAYMAkVTMRIwEAYDVQQIDAlBIENvcnXDsWExDzANBgNVBAcMBkZl
  cnJvbDEhMB8GA1UECgwYUE9TVEFMTCBESUdJVEFMIEJPWEVTIFNMMREwDwYDVQQL
  DAhUUEEgR09IVTEhMB8GA1UEAwwYVFBBIEdPSFUgQ0EgSU5URVJNRURJQVRFMIIB
  IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtFKhoRFrQ0yLoKZBVO3zXKp3
  NsaNUoDILQOiQXAXEgMFyQE5EER3CrTmVp1n1UDuZ4EKUXviJ2xVQX2Xf/ASjvqo
  iFJLO20n2n3//GbbqMnOTOwQvqcXEMnoZ60qrkl15g7pPXADWIdfKKD4h8hoDF7s
  9Mkw59YLlsdavs4ssquXhSEV0Sz/sS35PpNMLGOSX+Iv9D97yUYi8VpnypjFEhp4
  p1umB9my/l+KKGQdOQ9nXuENSoGI8gxu9ck752EQfnt2QCeBHtuZBtlHFEc7e49Q
  zkQa4jsEUsreKt49Uwe2QAfMsDYJQpGnaU/RTdebtMKeHoFEfbh5xzaKNgKrEQID
  AQABo4IBGDCCARQwDgYDVR0PAQH/BAQDAgEGMB8GA1UdIwQYMBaAFLoj9xx40/TO
  OZjoxiShYr9aJMkWMBIGA1UdEwEB/wQIMAYBAf8CAQAwga0GA1UdIASBpTCBojCB
  nwYEVR0gADCBljBmBggrBgEFBQcCAjBaHlhUUEEgR09IVSAoUE9TVEFMTCBESUdJ
  VEFMIEJPWEVTLCBDSUYgQjcwNTkwMDEzKS4gQ1BTIGVuIGh0dHA6Ly90cGEtZG9j
  LmdvaHUuZXMvZHBjcy5odG1sMCwGCCsGAQUFBwIBFiBodHRwOi8vdHBhLWRvYy5n
  b2h1LmVzL2RwY3MuaHRtbDAdBgNVHQ4EFgQUI9daD0VdMwULZk6ZBShN/FPTf6Ew
  DQYJKoZIhvcNAQELBQADggEBAITsNLmMNnO3XvOYf9H8Pn/sLe41Cw+5EDb61xoe
  zPiUWqpd+fs5TL60hRXWdiB+aNCWSzkJAT2sKlgjDOel/U4Vuvu6X8CifZ1OdUC6
  lNYYiuCB4PmZnsuVE96bjoLvtmwvVEEW5WC+NCH7PpAVeHmHJNgNx3Knt7YRUrIh
  Gb5/eWaqG60vTUIacXSdY9fZDEEF7i79c9Nge6ziLFkcDipIigiCmH3zoGofqJ+j
  hh8GMI5EZdu6eyJGTKw2d7dmPimwLecPc2Fc90qU8dq503XW9IJ2SYMP51d3ENMX
  y/IT/lZM8RhDmOytxOHb/gyDVBz20Fui2GGI1BisPK5Tw04=
  -----END CERTIFICATE-----`;
  
//DEBERÍA HACER LLAMADA OCSP DE TODOS LOS CERTIFICADOS IMPLICADOS EN LA FIRMA
//TANTO TSA COMO TODA LA CADENA DE LA AUTORIDAD GOHU

  private sPad;
  @ViewChild('sPad', { static: false }) set sPadSetter(content) {
    if (content) { // initially setter gets called with undefined

      this.sPad = new SignaturePad(content.nativeElement, {
        backgroundColor: "white"
      });

      this.sPad.onBegin = () => {

        if (!this.mediaRecorder) {

          let stream;

          /*if (content.nativeElement.mozCaptureStream) {
            stream = content.nativeElement.mozCaptureStream();//frames per second
          } else */
          if (content.nativeElement.captureStream) {
            stream = content.nativeElement.captureStream();//frames per second
          } else {
            return;
          }
          const types = [
            "video/webm\;codecs=vp8",
            "video/webm",

            "video/webm\;codecs=daala",
            "video/webm\;codecs=h264",
            "audio/webm\;codecs=opus",
            "video/mpeg"
          ];

          for (const t of types) {
            if (MediaRecorder.isTypeSupported(t)) {
              this.mediaType = t;
              break;
            }
          }

          this.recordedBlobs = [];
          // this.mediaType = 'video/webm';
          /*const firefox = ('netscape' in window) && / rv:/.test(navigator.userAgent);
          if (firefox) {
            return;
          }*/

          try {
            //console.log('Unable to create MediaRecorder with options Object: ', e0);
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mediaType });

          } catch (e1) {
            console.log('Unable to create MediaRecorder with options Object: ', e1);

            try {
              this.mediaRecorder = new MediaRecorder(stream, 'video/vp8'); // Chrome 47
              this.mediaType = 'video/webm; codecs=vp8';

            } catch (e3) {
              alert('MediaRecorder is not supported by this browser.\n\n' +
                'Try Firefox 29 or later, or Chrome 47 or later, ' +
                'with Enable experimental Web Platform features enabled from chrome://flags.');
              console.error('Exception while creating MediaRecorder:', e3);
              return;
            }

          }

          //this.mediaType = this.mediaRecorder.mimeType;

          this.mediaRecorder.ondataavailable = (event) => {
            // let tracks = stream.getTracks();
            //console.log(tracks);
            //           this.mediaRecorder.pause();
            //           this.mediaRecorder.resume();
            //el event.target solo debería estar a inactive en el utltima llamada despues del stop

            if (event.data && event.data.size > 0) {
              this.recordedBlobs.push(event.data);
            }
          };

          this.mediaRecorder.start(); //parameter 100, collect 100ms of data
        }
      };
    }
  }


  private buttonSendPin: MatButton;
  @ViewChild('buttonSendPin', { static: false }) set buttonSendPinSetter(content: MatButton) {
    if (content) { // initially setter gets called with undefined
      this.buttonSendPin = content;
      this.testSendPinDisabled();
      this.cd.detectChanges();
    }
  }

  private buttonResendPin: MatButton;
  @ViewChild('buttonResendPin', { static: false }) set buttonResendPinSetter(content: MatButton) {
    if (content) { // initially setter gets called with undefined
      this.buttonResendPin = content;
      this.testResendPinDisabled();
      this.cd.detectChanges();
    }
  }

  private buttonGenerateCert: MatButton;
  @ViewChild('buttonGenerateCert', { static: false }) set buttonGenerateCertSetter(content: MatButton) {
    if (content) { // initially setter gets called with undefined
      this.buttonGenerateCert = content;
      this.testButtonGenerateCertDisabled();
      this.cd.detectChanges();
    }
  }

  private buttonSign: MatButton;
  @ViewChild('buttonSign', { static: false }) set buttonSignSetter(content: MatButton) {
    if (content) { // initially setter gets called with undefined
      this.buttonSign = content;
      this.testButtonSignDisabled();
      this.cd.detectChanges();
    }
  }


  //@ViewChild('stepper', { static: false }) stepper: MatStepper;
  public validationFormGroup: FormGroup;
  public signatureFormGroup: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private service: SignatureService,
    private sanitizer: DomSanitizer,
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef
  ) {

    this.validationFormGroup = this.formBuilder.group(
      {
        pin: ['', [Validators.required, Validators.pattern(/^(\d){5}$/)]]
      }
    );

    this.signatureFormGroup = this.formBuilder.group(
      {
        aceptar: [false, Validators.requiredTrue]
      }
    );

    this.isFirefox = ('netscape' in window) && / rv:/.test(navigator.userAgent);
  }

  ngOnInit(): void {
    // Called after the constructor, initializing input properties, and the first call to ngOnChanges.

    const keys = forge.pki.rsa.generateKeyPair(2048);
    this.privKey = keys.privateKey;

    this.signatureObserver$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.id = params.get('id');
        this.reportUrl = environment.endPoint + '/signatures/' + this.id + '/report/firma';

        this.reportUrlSanitize = this.sanitizer.bypassSecurityTrustResourceUrl(this.reportUrl);
        this.reportSanitizePdfViewer = this.sanitizer.bypassSecurityTrustResourceUrl('assets/pdfjs/web/viewer.html?file=' + encodeURIComponent(this.reportUrl))
        this.signatureUrl = environment.endPoint + '/signatures/' + this.id + '/signature';
        return this.service.getOne(this.id);
      })
    ).subscribe(
      res => {
        this.signature = res;

        this.loadAttachments();

        if (this.signature.isSigned) {
          this.step = 2;
          this.handwrittenImage = this.sanitizer.bypassSecurityTrustUrl(this.signature.handwrittenImage);

          /*
          if (this.signature.handwrittenVideo) {
            this.handwrittenVideo = this.sanitizer.bypassSecurityTrustUrl(this.signature.handwrittenVideo);
          }

          setTimeout(() => {
            document.getElementById('video')['play']().then(
              () => {
                console.log('PLAY')
              }
            );
          }, 5000); /// solo se puede enviar un SMS cada 2 minutos
          */
        } else {
          // this.step = 1
        }
        // ESto debería enviar el PIN
      },
      error => {
        this.loadingSubject.next(false);
      }
    );

    this.loadingSubject.subscribe(
      res => {
        this.testSendPinDisabled();
        this.testResendPinDisabled();
        this.testButtonGenerateCertDisabled();
      }
    );
    this.timeoutPin.subscribe(
      res => {
        this.testResendPinDisabled();
      }
    );

    this.validationFormGroup.valueChanges.subscribe(
      res => {
        this.testButtonGenerateCertDisabled();
      }
    );

    this.signatureFormGroup.valueChanges.subscribe(
      res => {
        this.testButtonSignDisabled();
      }
    );

    // TEndría que pasarle el certificado del TSA y posiblemente del tpa
    //      timemarkUrl: '…',
    /*
    xades instanceof Xades // => true
    xades.setSignature(signThroughMagic(xades.signableHash))
    */

  }

  loadAttachments() {
    swal.default.fire({
      title: 'Cargando documentos adjutos',
      // html: 'data uploading',// add html attribute if you want or remove
      allowOutsideClick: false,
      onBeforeOpen: () => {
        swal.default.showLoading();
      },
    });

    if (this.numAttachmentLoaded < this.signature.attachments.length) {

      this.service.getAttachment(this.id, this.signature.attachments[this.numAttachmentLoaded].id).subscribe(
        res => {
          this.signature.attachments[this.numAttachmentLoaded].blob = res;
          this.signature.attachments[this.numAttachmentLoaded].sanitizeResource = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(res));
          this.signature.attachments[this.numAttachmentLoaded].sanitizeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.signature.attachments[this.numAttachmentLoaded].url);
          this.signature.attachments[this.numAttachmentLoaded].sanitizePdfViewer = this.sanitizer.bypassSecurityTrustResourceUrl('assets/pdfjs/web/viewer.html?file=' + encodeURIComponent(this.signature.attachments[this.numAttachmentLoaded].url))

          /// console.log('http://localhost:4200/assets/pdfjs/web/viewer.html?file=' + encodeURIComponent(this.signature.attachments[this.numAttachmentLoaded].url));

          const reader = new FileReader();
          //chrome
          reader.onload = () => {
            const buffer = reader.result;
            // this.signature.attachments[this.numAttachmentLoaded].arrayBuffer = buffer;
            this.signature.attachments[this.numAttachmentLoaded].base64 = Buffer.from(buffer).toString('base64');

            //console.log(this.signature.attachments[this.numAttachmentLoaded]);
            this.numAttachmentLoaded++;
            this.loadAttachments();
          };

          reader.readAsArrayBuffer(res);
          // this.signature.attachments[this.numAttachmentLoaded].blob['arrayBuffer']().then(
          //   buffer => {
          //     this.signature.attachments[this.numAttachmentLoaded].arrayBuffer = buffer;
          //     this.numAttachmentLoaded++;
          //     this.loadAttachments();
          //   }
          // );
        }
      );
    } else {
      swal.default.close();
      this.loadingSubject.next(false);
    }
  }

  testSendPinDisabled() {
    if (this.buttonSendPin) {
      this.buttonSendPin.disabled = (this.loadingSubject.getValue());
    }
  }

  testResendPinDisabled() {
    if (this.buttonResendPin) {
      this.buttonResendPin.disabled = (this.loadingSubject.getValue()) || this.timeoutPin.getValue();
    }
  }

  testButtonGenerateCertDisabled() {
    if (this.buttonGenerateCert) {
      this.buttonGenerateCert.disabled = (this.loadingSubject.getValue()) || this.validationFormGroup.invalid;
    }
  }

  testButtonSignDisabled() {
    if (this.buttonSign) {
      this.buttonSign.disabled = (this.loadingSubject.getValue()) || this.signatureFormGroup.invalid;
    }
  }

  sendPin() {
    this.loadingSubject.next(true);

    this.pinObserver$ = this.service.requestPIN(this.id).subscribe(
      () => {
        this.loadingSubject.next(false);
        this.pinRequested = true;
        this.testResendPinDisabled();
        this.timeoutPin.next(true);

        setTimeout(() => {
          this.timeoutPin.next(false);
        }, 60000); /// solo se puede enviar un SMS cada 10 minutos
      },
      error => { //puede deberse a q ya se ha pedido uno antes
        this.loadingSubject.next(false);
        this.pinRequested = true;
        this.testResendPinDisabled();
        this.timeoutPin.next(true);

        setTimeout(() => {
          this.timeoutPin.next(false);
        }, 60000); /// solo se puede enviar un SMS cada 10 minutos
      }
    );

  }

  cerrar() {
    window.close();
  }

  purpose() {
    return this.sanitizer.bypassSecurityTrustHtml(this.signature.purpose);
  }

  basis() {
    return this.sanitizer.bypassSecurityTrustHtml(this.signature.basis);
  }

  generateCertificate() {

    this.loadingSubject.next(true);
    swal.default.fire({
      title: 'Generando certificado',
      //  html: 'data uploading',// add html attribute if you want or remove
      allowOutsideClick: false,
      onBeforeOpen: () => {
        swal.default.showLoading();
      },
    });
    /*
    window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384"
      },
      false,
      ["sign", "verify"]
    );
    */
    // this.stepper.selectedIndex = 1;
    // generate a key pair
    const keys = forge.pki.rsa.generateKeyPair(2048);
    this.privKey = keys.privateKey;
    this.pubKey = keys.publicKey;

    // create a certification request (CSR)
    forge.options.usePureJavaScript = true;

    const csr = forge.pki.createCertificationRequest();

    forge.pki.oids.serialNumber = '2.5.4.5';
    forge.pki.oids['2.5.4.5'] = 'serialNumber';

    forge.pki.oids.telephoneNumber = '2.5.4.20';
    forge.pki.oids['2.5.4.20'] = 'telephoneNumber';

    forge.pki.oids['2.5.4.97'] = 'organizationIdentifier';
    forge.pki.oids.organizationIdentifier = '2.5.4.97';

    csr.publicKey = keys.publicKey;
    const attributes = [
      {
        shortName: 'CN',
        value: this.signature.commonName,
        valueTagClass: forge.asn1.Type.UTF8
      },
      {
        name: 'serialNumber',
        value: this.signature.serialNumber,
        type: '2.5.4.5',
      },
      {
        name: 'telephoneNumber',
        value: this.signature.telephoneNumber,
        type: '2.5.4.20',
        valueTagClass: forge.asn1.Type.UTF8
      }
    ];

    if (this.signature.countryName) {
      attributes.push(
        {
          shortName: 'C',
          value: this.signature.countryName,
          valueTagClass: forge.asn1.Type.UTF8
        }
      );
    }

    if (this.signature.stateOrProvinceName) {
      attributes.push(
        {
          shortName: 'ST',
          value: this.signature.stateOrProvinceName,
          valueTagClass: forge.asn1.Type.UTF8
        }
      );
    }

    if (this.signature.localityName) {
      attributes.push(
        {
          shortName: 'L',
          value: this.signature.localityName,
          valueTagClass: forge.asn1.Type.UTF8
        }
      );
    }

    if (this.signature.organizationId) {
      attributes.push(
        {
          name: 'organizationIdentifier',
          value: this.signature.organizationId,
          type: '2.5.4.97'
        }
      );
    }

    if (this.signature.organizationName) {
      attributes.push(
        {
          shortName: 'O',
          value: this.signature.organizationName,
          valueTagClass: forge.asn1.Type.UTF8
        }
      );
    }

    if (this.signature.organizationalUnitName) {
      attributes.push(
        {
          shortName: 'OU',
          value: this.signature.organizationalUnitName,
          valueTagClass: forge.asn1.Type.UTF8
        }
      );
    }

    csr.setSubject(attributes);

    // sign certification request
    csr.sign(keys.privateKey);

    // verify certification request
    const verified = csr.verify();

    if (verified) {
      // convert certification request to PEM-format
      const pem = forge.pki.certificationRequestToPem(csr);

      this.service.requestCertificate(this.id, pem, this.validationFormGroup.controls.pin.value).subscribe(
        (res: Blob) => {
          const reader = new FileReader();
          //chrome
          reader.onload = () => {
            this.certificate = reader.result;
            this.loadingSubject.next(false);
            swal.default.close();
            this.step = 1;

            //AQUI TENGO QUE CARGAR LOS ATTACHENTS
            setTimeout(() => {
              this.showPdfs = true;
            }, 100);
          };
          reader.readAsText(res);
          /*
                    res['text']().then(
                      text => {
                        this.certificate = text;
                        this.loadingSubject.next(false);
                        swal.default.close();
                        this.step = 1;
          
                        //AQUI TENGO QUE CARGAR LOS ATTACHENTS
                        setTimeout(() => {
                          this.showPdfs = true;
                        }, 100);
                      }
                    );
                    */
        },
        err => {
          this.loadingSubject.next(false);
        }
      );
    }
  }



  sign() {
    if (this.sPad.isEmpty()) {
      return false;
    }

    swal.default.fire({
      title: 'Validando firma digital',
      //  html: 'data uploading',// add html attribute if you want or remove
      allowOutsideClick: false,
      onBeforeOpen: () => {
        swal.default.showLoading();
      },
    });

    if (this.mediaRecorder) {

      this.mediaRecorder.onstop = () => {
        const reader = new FileReader();
        //chrome
        reader.onload = () => {
          this.recordedUrl = reader.result; // data url

          this.sPad.off();

          this.importKeys();
        };
        //segun documentacion de firefox
        /*
        reader.onloadend = () => {
          this.recordedUrl = reader.result; // data url
          console.log(this.recordedUrl);
          this.importKeys();
        };*/

        const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });//,
        reader.readAsDataURL(blob); // converts the blob to base64 and calls onload
      };

      if (this.mediaRecorder.state == 'recording') {
        //this.mediaRecorder.stream.requestFrame();
        //this.mediaRecorder.requestData();
        this.mediaRecorder.stop();
      } else {
        this.importKeys();
      }

    } else {
      this.sPad.off();
      this.importKeys();
    }
  }

  importKeys() {
    const subjectPublicKeyInfo = forge.pki.publicKeyToAsn1(this.pubKey);
    const publicKeyInfoDer = forge.asn1.toDer(subjectPublicKeyInfo).getBytes();
    const publicKeyInfoDerBuff = this.stringToArrayBuffer(publicKeyInfoDer);

    const rsaPrivateKey = forge.pki.privateKeyToAsn1(this.privKey);
    const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey);
    const privateKeyInfoDer = forge.asn1.toDer(privateKeyInfo).getBytes();
    const privateKeyInfoDerBuff = this.stringToArrayBuffer(privateKeyInfoDer);


    window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyInfoDerBuff,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      true,
      ['sign']).then(
        (key) => {

          window.crypto.subtle.importKey(
            'spki',
            publicKeyInfoDerBuff,
            {
              name: 'RSASSA-PKCS1-v1_5',
              hash: {
                name: 'SHA-256'
              }
            },
            true,
            ['verify']
          ).then(
            (pubKey) => {
              // console.log(key);
              this.signXml(key, pubKey);

            }
          );
        }
      );

    // signingTime: OptionsSigningTime
  }

  getXml() {

    // let xml = "\r\n";
    let xml = '<TPASignature Id="Signature-Root">';//+ '\n'
    xml += '<Purpose encoding="http://www.w3.org/2000/09/xmldsig#base64" MimeType="text/html">' + this.base64EncArr(this.strToUTF8Arr(this.signature.purpose)) + '</Purpose>';//+ '\n'
    xml += '<Basis encoding="http://www.w3.org/2000/09/xmldsig#base64" MimeType="text/html">' + this.base64EncArr(this.strToUTF8Arr(this.signature.basis)) + '</Basis>';// + '\n'
    if (this.signature.attachments.length > 0) {
      xml += '<Attachments>';// + '\n'
      for (const a of this.signature.attachments) {
        xml += '<Attachment encoding="http://www.w3.org/2000/09/xmldsig#base64" MimeType="application/pdf">';
        xml += a.base64;
        xml += '</Attachment>';//+ '\n'
      }
      xml += '</Attachments>';// + '\n'
    }

    this.handwrittenImage = this.sanitizer.bypassSecurityTrustResourceUrl(this.sPad.toDataURL("image/svg+xml"));
    xml += '<HandwrittenSignature>';//+ '\n'
    xml += '<ImgSrc MimeType="image/svg+xml">';
    xml += this.sPad.toDataURL("image/svg+xml");
    xml += '</ImgSrc>';// + '\n'
    if (this.recordedUrl) {
      this.handwrittenVideo = this.sanitizer.bypassSecurityTrustResourceUrl(this.recordedUrl);
      xml += '<VideoSrc MimeType="' + this.mediaType + '">';
      xml += this.recordedUrl;
      xml += '</VideoSrc>';
    }
    xml += '<BiometicData encoding="http://www.w3.org/2000/09/xmldsig#base64" MimeType="application/json">';
    xml += forge.util.encode64(JSON.stringify(this.sPad.toData()));
    xml += '</BiometicData>';// + '\n'
    xml += '</HandwrittenSignature>';// + '\n'
    xml += '</TPASignature>';

    xml = '<?xml version="1.0" encoding="UTF-8"?>' + xml;//+ '\n'

    return xml;
  }

  uint6ToB64(nUint6) {

    return nUint6 < 26 ?
      nUint6 + 65
      : nUint6 < 52 ?
        nUint6 + 71
        : nUint6 < 62 ?
          nUint6 - 4
          : nUint6 === 62 ?
            43
            : nUint6 === 63 ?
              47
              :
              65;

  }

  base64EncArr(aBytes) {

    var nMod3 = 2, sB64Enc = "";

    for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
      nMod3 = nIdx % 3;
      //if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
      nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
      if (nMod3 === 2 || aBytes.length - nIdx === 1) {
        sB64Enc += String.fromCharCode(this.uint6ToB64(nUint24 >>> 18 & 63), this.uint6ToB64(nUint24 >>> 12 & 63), this.uint6ToB64(nUint24 >>> 6 & 63), this.uint6ToB64(nUint24 & 63));
        nUint24 = 0;
      }
    }

    return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
  }

  strToUTF8Arr(sDOMStr) {

    var aBytes, nChr, nStrLen = sDOMStr.length, nArrLen = 0;

    /* mapeando... */

    for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
      nChr = sDOMStr.charCodeAt(nMapIdx);
      nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3 : nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6;
    }

    aBytes = new Uint8Array(nArrLen);

    /* transcripción... */

    for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
      nChr = sDOMStr.charCodeAt(nChrIdx);
      if (nChr < 128) {
        /* un byte */
        aBytes[nIdx++] = nChr;
      } else if (nChr < 0x800) {
        /* dos bytes */
        aBytes[nIdx++] = 192 + (nChr >>> 6);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else if (nChr < 0x10000) {
        /* tres bytes */
        aBytes[nIdx++] = 224 + (nChr >>> 12);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else if (nChr < 0x200000) {
        /* cuatro bytes */
        aBytes[nIdx++] = 240 + (nChr >>> 18);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else if (nChr < 0x4000000) {
        /* cinco bytes */
        aBytes[nIdx++] = 248 + (nChr >>> 24);
        aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else /* if (nChr <= 0x7fffffff) */ {
        /* seis bytes */
        aBytes[nIdx++] = 252 + (nChr >>> 30);
        aBytes[nIdx++] = 128 + (nChr >>> 24 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
      }
    }

    return aBytes;

  }

  signXml(key, pubKey) {

    const XAdES = window['XAdES'];
    const XmlDSigJs = window['XmlDSigJs'];


    this.signedXml = new XAdES.SignedXml();
    this.signedXml.signature.KeyInfo.Id = this.signedXml.signature.Id + '-KeyInfo';

    /*
        this.signedXml.SignedProperties.SignedSignatureProperties.SignaturePolicyIdentifier.SignaturePolicyId.SigPolicyId.Identifier.Value = "http://www.facturae.es/politica_de_firma_formato_facturae/politica_de_firma_formato_facturae_v3_1.pdf";
        this.signedXml.SignedProperties.SignedSignatureProperties.SignaturePolicyIdentifier.SignaturePolicyId.SigPolicyId.Description = "Política de Firma FacturaE v3.1";
        this.signedXml.SignedProperties.SignedSignatureProperties.SignaturePolicyIdentifier.SignaturePolicyId.SigPolicyHash.DigestMethod.Algorithm = "http://www.w3.org/2000/09/xmldsig#sha1";
        this.signedXml.SignedProperties.SignedSignatureProperties.SignaturePolicyIdentifier.SignaturePolicyId.SigPolicyHash.DigestValue.Value = "Ohixl6upD6av8N7pEvDABhEL6hM=";
    */
    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[0] = new XAdES.xml.DataObjectFormat();
    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[0].MimeType = 'text/xml';
    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[0].ObjectReference = '#' + this.signedXml.signature.Id + '-Reference0';

    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[1] = new XAdES.xml.DataObjectFormat();
    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[1].MimeType = 'text/xml';
    this.signedXml.SignedProperties.SignedDataObjectProperties.DataObjectFormats.items[1].ObjectReference = '#' + this.signedXml.signature.Id + '-Reference1';



    const originalXmlDoc = XAdES.Parse(this.getXml());
    this.signedXml.Sign(               // Signing document
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      key,                        // key
      originalXmlDoc,                                 // document
      {                                       // options
        keyValue: pubKey,
        references: [
          {
            id: this.signedXml.signature.Id + '-Reference0',
            uri: '',
            hash: 'SHA-256',
            transforms: ['enveloped', 'c14n']
          },
          {
            id: this.signedXml.signature.Id + '-Reference1',
            hash: 'SHA-256',
            uri: `#${this.signedXml.signature.KeyInfo.Id}`,
            transforms: ['c14n'],
          }
        ],
        policy: {
          hash: 'SHA-256',
          identifier: {
            value: 'urn:oid:2.16.724.1.3.1.1.2.1.9',
            qualifier: 'OIDAsURI',
            description: 'Prolitica de firma TPA GOHU'
          },
          qualifiers: [
            'http://www.facturae.es/politica_de_firma_formato_facturae/politica_de_firma_formato_facturae_v3_1.pdf'
          ]
        },
        productionPlace: {
          country: 'Spain',
          state: 'Pontevedra',
          city: 'Pontevedra',
          code: '36001',
        },
        signerRole: {
          claimed: [this.signature.role, 'Customer']
        },
        signingCertificate: this.getPeMBase64(this.certificate),
        x509: [
          this.getPeMBase64(this.certificate),
          this.getPeMBase64(this.issuer),
          this.getPeMBase64(this.root)
        ]
      }).then(
        (signature) => {

          this.signedXml.properties.UnsignedProperties = new XAdES.xml.UnsignedProperties();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties = new XAdES.xml.UnsignedSignatureProperties();
          /*
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0] = new XAdES.xml.CertificateValues();
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates = new XAdES.xml.EncapsulatedX509CertificateCollection();
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[0] = new XAdES.xml.EncapsulatedX509Certificate();
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[0].Value = Buffer.from(this.getPeMBase64(this.certificate), 'base64');
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[1] = new XAdES.xml.EncapsulatedX509Certificate();
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[1].Value = Buffer.from(this.getPeMBase64(this.issuer), 'base64');
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[2] = new XAdES.xml.EncapsulatedX509Certificate();
            this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[0].EncapsulatedX509Certificates.items[2].Value = Buffer.from(this.getPeMBase64(this.root), 'base64');
          */
          this.inserTimestamp();
        }
      );

  }

  inserTimestamp() {
    const XAdES = window['XAdES'];
    const signValue =
      '<ds:SignatureValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' +
      Buffer.from(this.signedXml.signature.SignatureValue).toString('base64') +
      '</ds:SignatureValue>';

    const md = forge.md.sha256.create();
    md.update(signValue);
    const b = Buffer.from(md.digest().getBytes(), 'binary');


    let hades = new HadesUndersign({});


    this.service.tsa(hades.timestampRequest(b)).subscribe(
      res => {
        const reader = new FileReader();
        //chrome
        reader.onload = () => {
          const buffer = reader.result;
          const tsaResponse = XadesUndesign.serializeTimestamp(hades.timestampResponse(buffer));
          const pos = this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items.length;
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos] = new XAdES.xml.SignatureTimeStamp();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].CanonicalizationMethod.Algorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].EncapsulatedTimeStamp = new XAdES.xml.EncapsulatedTimeStampCollection();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].EncapsulatedTimeStamp.items[0] = new XAdES.xml.EncapsulatedTimeStamp();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].EncapsulatedTimeStamp.items[0].Value = tsaResponse;
          this.insertCerficicateOcsp();
        };

        reader.readAsArrayBuffer(res);
      }
    );
  }


  insertCerficicateOcsp() {
    const XAdES = window['XAdES'];
    const hades = new HadesUndersign({ ocspUrl: 'https://tpa.gohu.es/ca/ocsp' });

    this.service.ocsp(hades.ocspRequest(this.certificate, this.issuer)).subscribe(
      res => {
        const reader = new FileReader();
        //chrome
        reader.onload = () => {
          const buffer = reader.result;
          const ocspResponse = XadesUndesign.serializeOcsp(hades.ocspResponse(buffer));
          const pos = this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items.length;
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos] = new XAdES.xml.RevocationValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues = new XAdES.xml.OCSPValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0] = new XAdES.xml.EncapsulatedOCSPValue();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0].Value = ocspResponse;
          this.insertIntermediateOcsp();
        };
        reader.readAsArrayBuffer(res);
      }
    );
  }

  insertIntermediateOcsp() {
    const XAdES = window['XAdES'];
    const hades = new HadesUndersign({ ocspUrl: 'https://tpa.gohu.es/ca/ocsp' });

    this.service.ocsp(hades.ocspRequest(this.issuer, this.root)).subscribe(
      res => {
        const reader = new FileReader();
        //chrome
        reader.onload = () => {
          const buffer = reader.result;
          const ocspResponse = XadesUndesign.serializeOcsp(hades.ocspResponse(buffer));
          const pos = this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items.length;
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos] = new XAdES.xml.RevocationValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues = new XAdES.xml.OCSPValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0] = new XAdES.xml.EncapsulatedOCSPValue();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0].Value = ocspResponse;
          this.insertRootOcsp();
        };
        reader.readAsArrayBuffer(res);
      }
    );
  }

  insertRootOcsp() {
    const XAdES = window['XAdES'];
    const hades = new HadesUndersign({ ocspUrl: 'https://tpa.gohu.es/ca/ocsp' });

    this.service.ocsp(hades.ocspRequest(this.root, this.root)).subscribe(
      res => {
        const reader = new FileReader();
        //chrome
        reader.onload = () => {
          const buffer = reader.result;
          const ocspResponse = XadesUndesign.serializeOcsp(hades.ocspResponse(buffer));
          const pos = this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items.length;
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos] = new XAdES.xml.RevocationValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues = new XAdES.xml.OCSPValues();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0] = new XAdES.xml.EncapsulatedOCSPValue();
          this.signedXml.properties.UnsignedProperties.UnsignedSignatureProperties.items[pos].OCSPValues.items[0].Value = ocspResponse;


          this.service.sign(this.id, this.signedXml.toString()).subscribe(
            res => {
              swal.default.close();
              this.signature.isSigned = true;
              this.step = 2;
              this.cd.detectChanges();
            }
          );
        };

        reader.readAsArrayBuffer(res);
      }
    );
  }

  ngOnDestroy() {
    this.signatureObserver$.unsubscribe();
    this.pinObserver$.unsubscribe();
  }

  descargarEvidencia() {
    window.location.href = this.reportUrl;
  }

  descargarXml() {
    window.location.href = this.signatureUrl;
  }

  showLoading() {
    /*
    swal.default.fire({
      title: 'Now loading',
      allowEscapeKey: false,
      allowOutsideClick: false,
      timer: 2000,
      onOpen: () => {
        swal.showLoading();
      }
    }).then(
      () => { },
      (dismiss) => {
        if (dismiss === 'timer') {
          console.log('closed by timer!!!!');
          swal.default.fire({
            title: 'Finished!',
            type: 'success',
            timer: 2000,
            showConfirmButton: false
          })
        }
      }
    )
    */
  }

  stringToArrayBuffer(data) {
    const arrBuff = new ArrayBuffer(data.length);
    const writer = new Uint8Array(arrBuff);
    for (let i = 0, len = data.length; i < len; i++) {
      writer[i] = data.charCodeAt(i);
    }
    return arrBuff;
  }

  convertPemToBinary(pem) {
    return this.base64StringToArrayBuffer(this.getPeMBase64(pem));
  }

  base64StringToArrayBuffer(b64str) {

    const byteStr = atob(b64str);
    const arrBuff = new ArrayBuffer(byteStr.length);
    const writer = new Uint8Array(arrBuff);
    for (let i = 0; i < byteStr.length; i++) {
      writer[i] = byteStr.charCodeAt(i);
    }

    return arrBuff;
  }

  getPeMBase64(pem) {
    const lines = pem.split('\n');
    let encoded = '';
    for (const line of lines) {
      if (line.trim().length > 0 &&
        line.indexOf('-BEGIN RSA PRIVATE KEY-') < 0 &&
        line.indexOf('-BEGIN RSA PUBLIC KEY-') < 0 &&
        line.indexOf('-END RSA PRIVATE KEY-') < 0 &&
        line.indexOf('-END RSA PUBLIC KEY-') < 0 &&
        line.indexOf('-END RSA PUBLIC KEY-') < 0 &&
        line.indexOf('-BEGIN CERTIFICATE-') < 0 &&
        line.indexOf('-END CERTIFICATE-') < 0
      ) {
        encoded += line.trim();
      }
    }
    return encoded.replace(/[\n\r\s]*/, '');
  }

  importPublicKey(pemKey) {
    return window.crypto.subtle.importKey(
      'spki',
      this.convertPemToBinary(pemKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
          name: 'SHA-1'
        }
      },
      true,
      ['verify']
    );
  }

}
