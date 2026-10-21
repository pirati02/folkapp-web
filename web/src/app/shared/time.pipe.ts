import {Pipe, PipeTransform} from '@angular/core';

/** Seconds as `m:ss` (or `h:mm:ss`). */
@Pipe({name: 'time', standalone: true})
export class TimePipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    const total = Math.max(0, Math.floor(seconds || 0));
    const pad = (value: number) => String(value).padStart(2, '0');
    const [h, m, s] = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
}
