import {Pipe, PipeTransform} from '@angular/core';
import {foldForSearch} from './georgian';

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** Splits `text` around the first occurrence of `term` so the template can emphasise it. */
@Pipe({name: 'highlight', standalone: true})
export class HighlightPipe implements PipeTransform {
  transform(text: string, term?: string | null): HighlightPart[] {
    const needle = foldForSearch(term?.trim() ?? '');
    // Folding keeps every character's length, so an index in the folded text is valid in the original.
    const index = needle ? foldForSearch(text).indexOf(needle) : -1;
    if (index < 0) {
      return [{text, match: false}];
    }
    return [
      {text: text.slice(0, index), match: false},
      {text: text.slice(index, index + needle.length), match: true},
      {text: text.slice(index + needle.length), match: false}
    ].filter(part => part.text);
  }
}
