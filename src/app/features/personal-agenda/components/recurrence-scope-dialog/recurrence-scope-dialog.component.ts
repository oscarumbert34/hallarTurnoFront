import { Component,inject } from '@angular/core';import { MAT_DIALOG_DATA,MatDialogModule,MatDialogRef } from '@angular/material/dialog';import { MatButtonModule } from '@angular/material/button';import { MatIconModule } from '@angular/material/icon';
export type RecurrenceScope='ONLY'|'FUTURE'|'ALL';
@Component({selector:'app-recurrence-scope-dialog',imports:[MatButtonModule,MatDialogModule,MatIconModule],template:`
 <h2 mat-dialog-title>{{data.operation==='edit'?'\u00bfQué querés modificar?':'\u00bfQué querés cancelar?'}}</h2>
 <mat-dialog-content><p>Elegí hasta dónde aplicar el cambio.</p><div class="options">
  <button mat-stroked-button (click)="choose('ONLY')"><mat-icon>event</mat-icon><span><strong>Solo este turno</strong><small>Los demás no cambian</small></span></button>
  <button mat-stroked-button (click)="choose('FUTURE')"><mat-icon>update</mat-icon><span><strong>Este y los siguientes</strong><small>Conserva el historial anterior</small></span></button>
  <button mat-stroked-button (click)="choose('ALL')"><mat-icon>repeat</mat-icon><span><strong>{{data.operation==='edit'?'Toda la serie':'Toda la serie futura'}}</strong><small>Aplica a la recurrencia completa</small></span></button>
 </div></mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Volver</button></mat-dialog-actions>`,styles:`.options{display:grid;gap:10px;min-width:min(360px,75vw)}.options button{height:auto;min-height:62px;justify-content:flex-start;text-align:left}.options span{display:grid;margin-left:8px}.options small{color:#667085;font-weight:400}h2{color:#0b1739}p{color:#667085}`})
export class RecurrenceScopeDialogComponent{readonly data=inject<{operation:'edit'|'delete'}>(MAT_DIALOG_DATA);private readonly ref=inject(MatDialogRef<RecurrenceScopeDialogComponent,RecurrenceScope>);choose(scope:RecurrenceScope){this.ref.close(scope);}}
