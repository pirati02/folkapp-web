import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { BottomBarService } from "../../services/bottom-bar.service";

export interface BottomBarItem {
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
    styleUrls: ['./bottom-bar.component.scss'],
    standalone: true,
    imports: [CommonModule, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomBarComponent implements OnInit {
    items: BottomBarItem[] = [];

    constructor(
        private service: BottomBarService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) {

    }

    ngOnInit(): void {
        this.service.items$.subscribe(items => {
            this.items = items;
            this.cdr.detectChanges();
        })
    }

    selectItem(item: BottomBarItem) {
        this.items.forEach(it => it.isSelected = (item.id === it.id));
        this.service.selectItem(item);
        this.cdr.detectChanges();
        if (item.link) {
            this.router.navigateByUrl(item.link).then();
        }
    }
}