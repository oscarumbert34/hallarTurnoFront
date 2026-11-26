import { Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize, Observable } from 'rxjs';
import { AgendaShare } from '../models/agenda-share.model';
import { AgendaSharingService } from '../services/agenda-sharing.service';

@Component({
  selector: 'app-agenda-sharing',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  template: `
    <section class="sharing">
      <button class="heading" type="button" (click)="expanded.set(!expanded())">
        <span><mat-icon>group</mat-icon><span><strong>Agenda compartida</strong><small>{{ summary() }}</small></span></span>
        <mat-icon>{{ expanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
      </button>
      @if (expanded()) {
        <div class="content">
          <form [formGroup]="form" (ngSubmit)="invite()">
            <mat-form-field appearance="outline"><mat-label>Correo del usuario</mat-label><input matInput type="email" formControlName="email" autocomplete="email" /></mat-form-field>
            <button mat-flat-button type="submit" [disabled]="form.invalid || busy()"><mat-icon>person_add</mat-icon>Invitar</button>
          </form>
          @if (message()) { <p class="message">{{ message() }}</p> }
          @for (share of shares(); track share.id) {
            @if (share.status !== 'REJECTED') {
              <article>
                <div><strong>{{ share.email }}</strong><small>{{ label(share) }}</small></div>
                <div class="actions">
                  @if (share.status === 'PENDING' && share.direction === 'RECEIVED') {
                    <button mat-button (click)="accept(share)">Aceptar</button><button mat-button (click)="reject(share)">Rechazar</button>
                  } @else if (share.status === 'PENDING') {
                    <button mat-button (click)="cancel(share)">Cancelar</button>
                  } @else {
                    <button mat-button (click)="unlink(share)">Desvincular</button>
                  }
                </div>
              </article>
            }
          }
        </div>
      }
    </section>
  `,
  styles: `
    .sharing{margin:0 0 16px;border:1px solid #dce7f6;border-radius:16px;background:#fff;overflow:hidden}.heading{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;border:0;background:#fff;color:#15335f;text-align:left;cursor:pointer}.heading>span{display:flex;align-items:center;gap:10px}.heading span span{display:grid}.heading small{color:#68758a;font-size:.76rem}.content{display:grid;gap:10px;padding:0 14px 14px}form{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}form button{height:56px}mat-form-field{width:100%}article{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-radius:12px;background:#f5f9ff}article>div:first-child{display:grid;min-width:0}article strong{overflow:hidden;text-overflow:ellipsis}article small{color:#68758a}.actions{display:flex;flex-wrap:wrap;justify-content:flex-end}.message{margin:0;color:#b42318;font-size:.85rem}@media(max-width:430px){form{grid-template-columns:1fr}form button{height:44px}article{align-items:flex-start;flex-direction:column}.actions{justify-content:flex-start}}
  `,
})
export class AgendaSharingComponent {
  private readonly service = inject(AgendaSharingService);
  private readonly builder = inject(NonNullableFormBuilder);
  readonly shares = input.required<AgendaShare[]>();
  readonly changed = output<void>();
  readonly expanded = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly form = this.builder.group({ email: ['', [Validators.required, Validators.email]] });
  summary(): string { const count=this.shares().filter(s=>s.status==='ACCEPTED').length;const pending=this.shares().filter(s=>s.status==='PENDING'&&s.direction==='RECEIVED').length;return pending?`${pending} invitación${pending===1?'':'es'} pendiente${pending===1?'':'s'}`:count?`${count} usuario${count===1?'':'s'} vinculado${count===1?'':'s'}`:'Invitá a otra persona'; }
  label(share: AgendaShare): string { return share.status==='ACCEPTED'?'Agenda vinculada':share.direction==='SENT'?'Invitación enviada':'Te invitó a compartir'; }
  invite(): void { if(this.form.invalid||this.busy())return;this.run(this.service.invite(this.form.controls.email.value.trim()),()=>this.form.reset()); }
  accept(s:AgendaShare):void{this.run(this.service.accept(s.id));} reject(s:AgendaShare):void{this.run(this.service.reject(s.id));}
  cancel(s:AgendaShare):void{this.run(this.service.cancel(s.id));} unlink(s:AgendaShare):void{if(confirm(`¿Dejar de compartir la agenda con ${s.email}?`))this.run(this.service.unlink(s.id));}
  private run(request:Observable<unknown>,done?:()=>void):void{this.busy.set(true);this.message.set('');request.pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{done?.();this.changed.emit();},error:(error)=>this.message.set(error?.error?.message??'No pudimos completar la acción.')});}
}
