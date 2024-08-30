import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface BottomBarItem{
    icon: string,
    title: string,
    link: string,
    isVisible: boolean;
    id: number,
    isSelected: boolean
};

@Component({
    selector: 'app-bottom-bar',
    templateUrl: './bottom-bar.component.html',
    styleUrls: ['./bottom-bar.component.scss']
})
export class BottomBarComponent {
    @Input() items: BottomBarItem[] = [];
    @Input() set selectedItem(val: BottomBarItem) {
        this.selectItem(val);
    }
    @Output() itemSelected: EventEmitter<BottomBarItem> = new EventEmitter();
    
    selectItem(item: BottomBarItem) {
        this.items.forEach(item => item.isSelected = false);
        item!.isSelected = true;
        this.itemSelected.next(item);
    }
}