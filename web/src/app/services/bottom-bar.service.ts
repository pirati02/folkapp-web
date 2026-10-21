import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { BottomBarItem } from "../widgets/bottom-bar/bottom-bar.component";
import { ArtistType } from "../models/artist.type";

/** Bottom-bar id of the home page; the artist lists use their ArtistType. */
export const NAV_HOME = 0;

/** The app's main sections; `selectedType` marks the current one (none, e.g. on search). */
export function mainNavItems(selectedType?: ArtistType | typeof NAV_HOME): BottomBarItem[] {
    return [
        <BottomBarItem>{
            id: NAV_HOME,
            icon: 'home',
            title: 'მთავარი',
            link: '/',
            isSelected: selectedType === NAV_HOME,
            isVisible: true
        },
        <BottomBarItem>{
            id: ArtistType.ARTIST,
            icon: 'group',
            title: 'ანსამბლები',
            link: '/artists/' + ArtistType.ARTIST,
            isSelected: selectedType == ArtistType.ARTIST,
            isVisible: true
        },
        <BottomBarItem>{
            id: ArtistType.OLD_RECORDINGS,
            icon: 'system_update_alt',
            title: 'ძველი ჩანაწერები',
            link: '/artists/' + ArtistType.OLD_RECORDINGS,
            isSelected: selectedType == ArtistType.OLD_RECORDINGS,
            isVisible: true
        }
    ];
}

@Injectable({
    providedIn: 'root'
})
export class BottomBarService {
    private _items: BehaviorSubject<BottomBarItem[]> = new BehaviorSubject<BottomBarItem[]>([]);
    public items$: Observable<BottomBarItem[]> = this._items.asObservable();

    // Not replayed: a page that opens later must not react to a tap made on another page.
    private _selectItem = new Subject<BottomBarItem>();
    public selectItem$: Observable<BottomBarItem> = this._selectItem.asObservable();

    setItems(items: BottomBarItem[]) {
        this._items.next(items);
    }

    selectItem(item: BottomBarItem){
        this._selectItem.next(item);
    }
}
