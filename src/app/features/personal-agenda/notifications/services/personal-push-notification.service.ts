import { HttpClient } from '@angular/common/http';import { inject,Injectable } from '@angular/core';import { SwPush } from '@angular/service-worker';import { firstValueFrom } from 'rxjs';import { API_BASE_URL } from '../../../../shared/api-base-url.token';import { NotificationPreference,PushPublicKey } from '../models/notification-preference.model';
@Injectable({providedIn:'root'}) export class PersonalPushNotificationService{
 private readonly http=inject(HttpClient);private readonly swPush=inject(SwPush);private readonly base=`${inject(API_BASE_URL)}/personal-agenda`;
 get browserSupportsPush(){return 'Notification' in globalThis&&'PushManager' in globalThis&&'serviceWorker' in navigator;}
 get serviceWorkerEnabled(){return this.swPush.isEnabled;}
 get supported(){return this.browserSupportsPush&&this.serviceWorkerEnabled;}
 get permission():NotificationPermission|'unsupported'{return 'Notification' in globalThis?Notification.permission:'unsupported';}
 preferences(){return this.http.get<NotificationPreference>(`${this.base}/notifications/preferences`);}
 update(value:NotificationPreference){return this.http.put<NotificationPreference>(`${this.base}/notifications/preferences`,value);}
 async enable():Promise<NotificationPreference>{if(!this.browserSupportsPush)throw new Error('UNSUPPORTED');if(!this.serviceWorkerEnabled)throw new Error('SERVICE_WORKER_DISABLED');const config=await firstValueFrom(this.http.get<PushPublicKey>(`${this.base}/push/public-key`));if(!config.configured||!config.publicKey)throw new Error('NOT_CONFIGURED');const subscription=await this.swPush.requestSubscription({serverPublicKey:config.publicKey});const data=subscription.toJSON();await firstValueFrom(this.http.post<void>(`${this.base}/push/subscriptions`,{endpoint:data.endpoint,p256dh:data.keys?.['p256dh'],auth:data.keys?.['auth']}));return firstValueFrom(this.preferences());}
 async disable(current:NotificationPreference):Promise<NotificationPreference>{const subscription=await firstValueFrom(this.swPush.subscription);if(subscription){await firstValueFrom(this.http.request<void>('DELETE',`${this.base}/push/subscriptions`,{body:{endpoint:subscription.endpoint}}));await this.swPush.unsubscribe();}return firstValueFrom(this.update({...current,pushEnabled:false}));}
 isIosNotStandalone():boolean{const nav=navigator as Navigator&{standalone?:boolean};return /iphone|ipad|ipod/i.test(nav.userAgent)&&!nav.standalone&&!matchMedia('(display-mode: standalone)').matches;}
}
