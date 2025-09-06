import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { BottomBarItem } from "../widgets/bottom-bar/bottom-bar.component";

@Injectable({
    providedIn: 'root'
})
export class BottomBarService {
    private _items: BehaviorSubject<BottomBarItem[]> = new BehaviorSubject<BottomBarItem[]>([]);
    public items$: Observable<BottomBarItem[]> = this._items.asObservable();

    private _selectItem: BehaviorSubject<BottomBarItem> = new BehaviorSubject<BottomBarItem>(this._items.value[0]);
    public selectItem$: Observable<BottomBarItem> = this._selectItem.asObservable();

    setItems(items: BottomBarItem[]) {
        this._items.next(items);
    }

    selectItem(item: BottomBarItem){
        this._selectItem.next(item);
    }
}