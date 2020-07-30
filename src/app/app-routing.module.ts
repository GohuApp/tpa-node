import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { from } from 'rxjs';
import { SignatureComponent } from './signature-component/signature.component';
import { NewSignatureComponent } from './newsignature-component/newsignature.component';
import { ExchangeCodeComponent } from './exchangecode-component/exchangecode.component';
import { WelcomeComponent } from './welcome-component/welcome.component';

//const routes: Routes = [];
const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'new',
        component: NewSignatureComponent
      },
      {
        path: 'wellcome',
        component: WelcomeComponent
      },
      {
        path: 'signature',
        children: [
          {
            path: ':id',
            component: SignatureComponent
          },
        ]
      },
      {
        path: 'exchage',
        children: [
          {
            path: ':id',
            component: ExchangeCodeComponent
          },
        ]
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
