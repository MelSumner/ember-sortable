/* eslint-disable ember/no-computed-properties-in-native-classes */
/* eslint-disable ember/no-incorrect-calls-with-inline-anonymous-functions */
import Modifier from 'ember-modifier';
import { action, set } from '@ember/object';
import {
  isDownArrowKey,
  isEnterKey,
  isEscapeKey,
  isLeftArrowKey,
  isRightArrowKey,
  isSpaceKey,
  isUpArrowKey,
} from '../utils/keyboard.ts';
import { ANNOUNCEMENT_ACTION_TYPES } from '../utils/constant.ts';
import { defaultA11yAnnouncementConfig, type A11yAnnouncementConfig } from '../utils/defaults.ts';
import { next, schedule, scheduleOnce, later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { registerDestructor, isDestroyed } from '@ember/destroyable';
import type { ArgsFor, PositionalArgs, NamedArgs } from 'ember-modifier';
import type Owner from '@ember/owner';
import type EmberSortableService from '../services/ember-sortable-internal-state.ts';
import type { Group } from '../services/ember-sortable-internal-state.ts';
import type SortableItemModifier from './sortable-item.ts';
import type { MoveDirection } from './sortable-item.ts';

const NO_MODEL: HandleVisualClass = {};

export interface HandleVisualClass {
  UP?: string;
  DOWN?: string;
  LEFT?: string;
  RIGHT?: string;
}

interface Position {
  x: number;
  y: number;
}

export type TDirection = 'x' | 'y' | 'grid';

interface SortableGroupModifierSignature<T> {
  Args: {
    Named: {
      direction?: TDirection;
      groupName?: string;
      disabled?: boolean;
      handleVisualClass?: HandleVisualClass;
      a11yAnnouncementConfig?: A11yAnnouncementConfig;
      itemVisualClass?: string;
      a11yItemName?: string;
      onChange: (itemModels: T[], draggedModel: T | undefined) => void;
    };
    Positional: unknown[];
  };
  Element: HTMLElement;
}

/**
 * Modifier to apply a11y support to a group container for the Sortable component
 *
 * @param {String} [a11yItemName] A name for each model, used for creating more meaningful a11y announcements.
 * @param {Object} [a11yAnnouncementConfig] A map of action to function to build meaningful a11y announcements.
 * @param {String} [itemVisualClass] A class for styling visual indicators on the yielded `sortable-item`.
 * @param {Object} [handleVisualClass] An object for styling visual indicators on the yielded `sortable-handle` on different `move`.
 * @param {Function} [onChange] An optional callback for when position rearrangements are confirmed.
 *
 * @module drag-drop/draggable-group
 * @example
 *    <ol {{sortable-group onChange=this.update a11yAnnouncementConfig=this.myA11yConfig}}>
 *      {{#each model.items as |item|}}
 *        <li {{sortable-item model=item}}>
 *          {{item.name}}
 *          <span class="handle" {{sortable-handle}}>&varr;</span>
 *        </li>
 *      {{/each}}
 *    </ol>
 */
export default class SortableGroupModifier<T> extends Modifier<SortableGroupModifierSignature<T>> {
  /** Primary keyboard utils */
  // Tracks the currently selected item
  _selectedItem: SortableItemModifier<T> | null = null;
  _group: SortableGroupModifier<T> | null = null;
  _firstItemPosition?: Position;
  _groupDef!: Group<T>;

  // Tracks the current move
  move = null;
  moves: [number, number][] = [];

  // Tracks the status of keyboard reorder mode
  isKeyboardReorderModeEnabled = false;

  isKeyDownEnabled = false;

  // Tracks if we're still performing a programmatic focus.
  isRetainingFocus = false;
  /** End of keyboard utils */

  get disabled() {
    return this.named.disabled || false;
  }

  /** Start of a11y properties */
  /**
   * @property an object containing different classes for visual indicators
   * @type {Object}
   * @default null
   * @example
   * {
   *  UP: 'up'
   *  DOWN: 'down',
   *  LEFT: 'left',
   *  RIGHT: 'right',
   * }
   */
  get handleVisualClass(): HandleVisualClass {
    return this.named.handleVisualClass || NO_MODEL;
  }

  /**
   * @property an object containing functions for producing screen reader announcements
   * @type {Object}
   * @example
   * {
   *  MOVE: function() {},
   *  ACTIVATE: function() {},
   *  CONFIRM: function() {},
   *  CANCEL: function() {},
   * }
   */
  get a11yAnnouncementConfig(): A11yAnnouncementConfig {
    return this.named.a11yAnnouncementConfig || defaultA11yAnnouncementConfig;
  }

  get itemVisualClass(): string {
    return this.named.itemVisualClass || 'is-activated';
  }

  get a11yItemName(): string {
    return this.named.a11yItemName || 'item';
  }
  /** End of a11y properties */

  /**
   * Make sure that we cancel any ongoing keyboard operation when the focus is lost from the handle.
   * Because this can be fired pre-maturely, effectively cancelling before other keyboard operations,
   * we need to wait until other operations are completed, so this will cancel properly.
   *
   * @param {Event} event a DOM event.
   */
  @action
  focusOut() {
    if (!this.isRetainingFocus && !this._isElementWithinHandle(document.activeElement)) {
      this.cancelKeyboardSelection();
    }
  }

  /**
   * Explanation
   * 1. `KeyboardReorderMode` is disabled: users can activate it via ENTER or SPACE.
   * 2. `KeyboardReorderMode` is enabled: users can reorder via UP or DOWN arrow keys. TODO: Expand to more keys, e.g LEFT, RIGHT
   * 3. `KeyboardReorderMode` is enabled: users can finalize/save the reordering via ENTER or SPACE.
   * 4. `KeyboardReorderMode` is enabled: users can discard the reordering via ESC.
   *
   * @param {Event} event a DOM event
   */
  @action
  keyDown(event: KeyboardEvent) {
    if (!this.isKeyDownEnabled) {
      return;
    }

    // Note: If handle is specified, we need to target the keyDown on the handle
    const isKeyboardReorderModeEnabled = this.isKeyboardReorderModeEnabled;

    if (!isKeyboardReorderModeEnabled && (isEnterKey(event) || isSpaceKey(event))) {
      const _selectedItem = this._selectedItem;

      if (!_selectedItem) {
        return;
      }

      this._prepareKeyboardReorderMode();
      this._announceAction(ANNOUNCEMENT_ACTION_TYPES.ACTIVATE);
      this._updateItemVisualIndicators(_selectedItem, true);
      this._updateHandleVisualIndicators(_selectedItem, true);

      this.isRetainingFocus = true;

      scheduleOnce('render', this, () => {
        this.element.focus();
        this.isRetainingFocus = false;
      });

      // Prevent the default scroll
      event.preventDefault();
      return;
    }

    if (isKeyboardReorderModeEnabled) {
      this._handleKeyboardReorder(event);
      event.preventDefault();
    }
  }

  /**
   * Checks if the given element is a child of a handle.
   *
   * @param {Element} element a DOM element.
   */
  _isElementWithinHandle(element: Element | null): boolean {
    return !!element?.closest(`[data-sortable-handle]`);
  }

  /**
   * Moves an sortedItem from one index to another index, effectively performing an reorder.
   *
   * @param {Integer} fromIndex the original index
   * @param {Integer} toIndex the new index
   */
  _move(fromIndex: number, toIndex: number) {
    const direction = this.direction;
    const sortedItems = this.sortedItems;
    const item = sortedItems[fromIndex];
    const nextItem = sortedItems[toIndex];

    if (!nextItem || !item) {
      return;
    }

    // switch direction values to notify sortedItems to update, so it sorts by direction.
    let value;
    const dimension = direction === 'y' ? 'height' : 'width';
    // DOWN or RIGHT
    if (toIndex > fromIndex) {
      if (direction === 'grid') {
        const valueX = item.x;
        const valueY = item.y;
        item.x = nextItem.x + (nextItem.width - item.width);
        item.y = nextItem.y + (nextItem.height - item.height);
        nextItem.x = valueX;
        nextItem.y = valueY;
      } else {
        value = item[direction];
        set(item, direction, nextItem[direction] + (nextItem[dimension] - item[dimension]));
        set(nextItem, direction, value);
      }
      // UP or LEFT
    } else {
      if (direction === 'grid') {
        const valueX = nextItem.x;
        const valueY = nextItem.y;
        nextItem.x = item.x + (item.width - nextItem.width);
        nextItem.y = item.y + (item.height - nextItem.height);
        item.x = valueX;
        item.y = valueY;
      } else {
        value = nextItem[direction];
        set(nextItem, direction, item[direction] + (item[dimension] - nextItem[dimension]));
        set(item, direction, value);
      }
    }
  }

  /**
   * Handles all of the keyboard operations, such as
   * 1. Keyboard navigation for UP, DOWN, LEFT, RIGHT
   * 2. Confirming reorder
   * 3. Discard reorder
   * 4. Also handles refocusing the element that triggered the interaction.
   *
   * @param {Event} event a DOM event.
   */
  _handleKeyboardReorder(event: KeyboardEvent) {
    const direction = this.direction;
    const selectedItem = this._selectedItem;

    if (!selectedItem) {
      return;
    }

    if (direction === 'y' && isDownArrowKey(event)) {
      this.moveItem(selectedItem, 1);
    } else if (direction === 'y' && isUpArrowKey(event)) {
      this.moveItem(selectedItem, -1);
    } else if ((direction === 'x' || direction === 'grid') && isLeftArrowKey(event)) {
      this.moveItem(selectedItem, -1);
    } else if ((direction === 'x' || direction === 'grid') && isRightArrowKey(event)) {
      this.moveItem(selectedItem, 1);
    } else if (isEnterKey(event) || isSpaceKey(event)) {
      // confirm will reset the selectedItem, so caching it here before we remove it.
      const itemElement = selectedItem.element;
      this._announceAction(ANNOUNCEMENT_ACTION_TYPES.CONFIRM);
      this.confirmKeyboardSelection();

      this.isRetainingFocus = true;
      scheduleOnce('render', this, () => this._focusItem(itemElement));
    } else if (isEscapeKey(event)) {
      // cancel will reset the selectedItem, so caching it here before we remove it.
      const _selectedItemElement = selectedItem.element;
      this._announceAction(ANNOUNCEMENT_ACTION_TYPES.CANCEL);
      this.cancelKeyboardSelection();

      this.isRetainingFocus = true;
      scheduleOnce('render', this, () => {
        const moves = this.moves;
        if (moves && moves[0]) {
          const sortedItems = this.sortedItems;
          const fromIndex = moves[0][1];
          const itemElement = sortedItems[fromIndex]?.element;
          if (itemElement) {
            this._focusItem(itemElement);
          }
        } else {
          this._focusItem(_selectedItemElement);
        }
        this.isRetainingFocus = false;
      });
    }
  }

  /**
   * Moves the item to its new position and adds the move to our history.
   *
   * @param {SortableItemModifier} item the item to be moved.
   * @param {Integer} delta how much to move index-wise.
   */
  moveItem(item: SortableItemModifier<T>, delta: number) {
    const sortedItems = this.sortedItems;
    const moves = this.moves;

    const sortedIndex = sortedItems.indexOf(item);
    const newSortedIndex = sortedIndex + delta;

    // If out of bounds, we don't do anything.
    if (newSortedIndex < 0 || newSortedIndex >= sortedItems.length) {
      return;
    }
    this._announceAction(ANNOUNCEMENT_ACTION_TYPES.MOVE, delta);
    // Guarantees that the before the UI is fully rendered before we move again.
    scheduleOnce('render', this, () => {
      this._move(sortedIndex, newSortedIndex);
      this._updateHandleVisualIndicators(item, true);

      moves.push([sortedIndex, newSortedIndex]);
    });
  }

  /**
   * Handles all the necessary operations needed for cancelling the current keyboard selection.
   * 1. Disables keyboard reorder mode.
   * 2. Undo all of the tracked moves.
   * 3. Tears down the application container, so we are not focus locked within the application.
   * 4. Resets the current selected item.
   */
  @action
  cancelKeyboardSelection() {
    const _selectedItem = this._selectedItem;

    if (!_selectedItem) {
      return;
    }

    this._disableKeyboardReorderMode();
    // Revert the process by reversing the move.
    const moves = this.moves;
    while (moves.length > 0) {
      const move = moves.pop();
      const fromIndex = move ? move[1] : 0;
      const toIndex = move ? move[0] : 0;
      this._move(fromIndex, toIndex);
    }
    this._tearDownA11yApplicationContainer();
    this._updateItemVisualIndicators(_selectedItem, false);
    this._updateHandleVisualIndicators(_selectedItem, false);
    this._resetItemSelection();
  }

  /**
   * Handles all th necessary operations needed for confirming the current keyboard selection.
   * 1. Disables keyboard reorder mode.
   * 2. Tears down the application container, so we are not focus locked within the container.
   * 3. Make sure to update and sync all the internal items and UI.
   * 4. Triggers the `onChange` action if provided.
   * 5. Resets the currently selected item.
   */
  confirmKeyboardSelection() {
    const _selectedItem = this._selectedItem;

    if (!_selectedItem) {
      return;
    }

    this.moves = [];
    this._disableKeyboardReorderMode();
    this._tearDownA11yApplicationContainer();
    set(_selectedItem, 'wasDropped', true);
    this.commit();
    this._updateItemVisualIndicators(_selectedItem, false);
    this._updateHandleVisualIndicators(_selectedItem, false);
    this._resetItemSelection();
  }

  /**
   * Announces the message constructed from `a11yAnnouncementConfig`.
   *
   * @param {String} type the action type.
   * @param {Number} delta how much distance (item-wise) is being moved.
   */
  _announceAction(type: keyof A11yAnnouncementConfig, delta: number = 0): void {
    const a11yAnnouncementConfig = this.a11yAnnouncementConfig;
    const a11yItemName = this.a11yItemName;

    if (!a11yItemName || !(type in a11yAnnouncementConfig)) {
      return;
    }

    const sortedItems = this.sortedItems;
    const _selectedItem = this._selectedItem;

    if (!_selectedItem) {
      return;
    }

    const index = sortedItems.indexOf(_selectedItem);
    const announcer = this.announcer;

    if (!announcer) {
      return;
    }

    const config = {
      a11yItemName,
      index: index,
      maxLength: sortedItems.length,
      direction: this.direction,
      delta,
    };

    const message = a11yAnnouncementConfig[type](config);
    announcer.textContent = message;

    // Reset the message after the message is announced.
    later(() => {
      announcer.textContent = '';
    }, 1000);
  }

  /**
   * Reset the selected item.
   */
  _resetItemSelection(): void {
    this._selectedItem = null;
  }

  /**
   * Updates the selected item's visual indicators.
   *
   * @param {SortableItemModifier} item the selected item.
   * @param {Boolean} isActive to activate or deactivate the class.
   */
  _updateItemVisualIndicators(item: SortableItemModifier<T>, isActive: boolean) {
    const itemVisualClass = this.itemVisualClass;

    if (!itemVisualClass || !item) {
      return;
    }

    if (isActive) {
      item.element.classList.add(itemVisualClass);
    } else {
      item.element.classList.remove(itemVisualClass);
    }
  }

  /**
   * Updates the selected item's handle's visual indicators
   *
   * @param {SortableItemModifier} item the selected item.
   * @param {boolean} isUpdate to update or not update.
   */
  _updateHandleVisualIndicators(item: SortableItemModifier<T>, isUpdate: boolean) {
    const handleVisualClass = this.handleVisualClass;

    if (handleVisualClass === NO_MODEL || !item) {
      return;
    }

    const sortedItems = this.sortedItems;
    const direction = this.direction;
    const index = sortedItems.indexOf(item);
    const handle = item.element.querySelector('[data-sortable-handle');
    const visualHandle = handle ? handle : item.element;
    const visualKeys: (keyof HandleVisualClass)[] = direction === 'y' ? ['UP', 'DOWN'] : ['LEFT', 'RIGHT'];

    visualKeys.forEach((visualKey) => {
      visualHandle.classList.remove(handleVisualClass[visualKey] ?? '');
    });

    if (!isUpdate) {
      return;
    }

    if (index > 0 && visualKeys[0]) {
      visualHandle.classList.add(handleVisualClass[visualKeys[0]] ?? '');
    }

    if (index < sortedItems.length - 1 && visualKeys[1]) {
      visualHandle.classList.add(handleVisualClass[visualKeys[1]] ?? '');
    }
  }

  /**
   * Sets focus on the current item or its handle.
   *
   * @param {Element} itemElement an DOM element representing an sortable-item.
   */
  _focusItem(itemElement: HTMLElement): void {
    const handle = itemElement.querySelector('[data-sortable-handle]') as HTMLElement | null;
    if (handle) {
      handle.focus();
    } else {
      // The consumer did not use a handle, so we set focus back to the item.
      itemElement.focus();
    }
  }

  /**
   * Enables keyboard reorder mode.
   */
  _enableKeyboardReorderMode(): void {
    this.isKeyboardReorderModeEnabled = true;
  }

  /**
   * Disables keyboard reorder mode
   */
  _disableKeyboardReorderMode(): void {
    this.isKeyboardReorderModeEnabled = false;
  }

  /**
   * Sets up the group as an application and make it programmatically focusable.
   */
  _setupA11yApplicationContainer(): void {
    this.element.setAttribute('role', 'application');
    this.element.tabIndex = -1;
  }

  /**
   * Tears down the `role=application` container.
   */
  _tearDownA11yApplicationContainer(): void {
    this.element.removeAttribute('role');
    this.element.removeAttribute('tabIndex');
  }

  _prepareKeyboardReorderMode(): void {
    this._enableKeyboardReorderMode();
    this._setupA11yApplicationContainer();
  }

  // Begin of API

  /**
   @property direction
   @type string
   @default y
   */
  get direction() {
    return this.named.direction || 'y';
  }

  /**
   Called when order of items has been changed
   @property onChange
   @type Function
   @param {Object} groupModel group model (omitted if not set)
   @param {Object[]} newModel models in their new order
   @param {Object} itemModel model just dragged
   @default null
   */
  get onChange() {
    return this.named.onChange;
  }

  @service('ember-sortable-internal-state')
  declare sortableService: EmberSortableService<T>;

  /**
   * This is the group name used to keep groups separate if there are more than one on the screen at a time.
   * If no group is assigned a default is used
   *
   * @default "_EmberSortableGroup"
   * @returns {*|string}
   */
  get groupName(): string {
    return this.named.groupName || '_EmberSortableGroup';
  }

  /**
   This is an array of SortableItemModifiers

   @property items
   @type SortableItemModifier[]
   */
  get items(): SortableItemModifier<T>[] {
    return this._groupDef.items;
  }
  set(items: SortableItemModifier<T>[]) {
    this._groupDef.items = items;
  }

  /**
   * Announcer element
   *
   * @type {Element}
   */
  announcer: Element | null = null;

  /**
   Position for the first item.
   If spacing is present, first item's position will have to change as well.
   @property firstItemPosition
   @type Number
   */
  get firstItemPosition(): Position {
    const sortedItems = this.sortedItems;

    const item = sortedItems[0];

    if (!item) {
      return {
        x: 0,
        y: 0,
      };
    }

    return {
      x: item.x - item.spacing,
      y: item.y - item.spacing,
    };
  }

  /**
   An array of DOM elements.
   @property sortedItems
   @type SortableItemModifier[]
   */
  get sortedItems(): SortableItemModifier<T>[] {
    const direction = this.direction;

    const groupStyles = getComputedStyle(this.element);
    const groupWidth = parseFloat(groupStyles.width);

    return this.items.sort((a, b) => {
      if (direction === 'grid') {
        const { ax, ay, bx, by } = this._calculateGridPosition(a, b, groupWidth);
        if (ay == by) return ax - bx;
        return ay - by;
      }
      return a[direction] - b[direction];
    });
  }

  /**
   * Enables keyboard navigation
   */
  @action
  activateKeyDown(selectedItem: SortableItemModifier<T>): void {
    this._selectedItem = selectedItem;
    this.isKeyDownEnabled = true;
  }

  /**
   * Disables keyboard navigation
   * Currently used to handle keydown events bubbling up from
   * elements that aren't meant to invoke keyboard navigation
   * by ignoring them.
   */
  @action
  deactivateKeyDown(): void {
    this.isKeyDownEnabled = false;
  }

  /**
   Register the group with this Sortable.
   @method registerGroup
   @param {SortableGroupModifier} group
   */
  @action
  registerGroup(group: SortableGroupModifier<T>): void {
    this._group = group;
  }

  /**
   De-register the group with this Sortable.
   @method deregisterGroup
   @param {SortableGroupModifier} group
   */
  @action
  deregisterGroup(group: SortableGroupModifier<T>) {
    if (this._group === group) {
      this._group = null;
    }
  }

  /**
   Prepare for sorting.
   Main purpose is to stash the current firstItemPosition so
   we don’t incur expensive re-layouts.
   @method _prepare
   */
  @action
  prepare() {
    this._firstItemPosition = this.firstItemPosition;
  }

  /**
   Update item positions (relatively to the first element position).
   @method update
   @param {SortableItemModifier[]} sortedItems
   */
  @action
  update(sortedItems: SortableItemModifier<T>[]): void {
    if (!sortedItems) {
      sortedItems = this.sortedItems;
    }

    // Position of the first element
    let axis = this._firstItemPosition;

    // Just in case we haven’t called prepare first.
    if (axis === undefined) {
      axis = this.firstItemPosition;
    }

    const direction = this.direction;

    let position = 0;
    let groupPositionRight = 0;
    let lastTopOffset = 0;
    let maxPrevHeight = 0;

    if (direction === 'grid') {
      position = axis.x;
      lastTopOffset = axis.y;
      const groupStyles = getComputedStyle(this.element);
      groupPositionRight = position + parseFloat(groupStyles.width);
    } else {
      position = axis[direction];
    }

    sortedItems.forEach((item) => {
      if (direction === 'grid' && position + item.width > groupPositionRight) {
        lastTopOffset = lastTopOffset + maxPrevHeight;
        position = axis.x;
        maxPrevHeight = 0;
      }

      if (!isDestroyed(item) && !item.isDragging) {
        if (direction === 'grid') {
          item.x = position;
          item.y = lastTopOffset;
        } else {
          set(item, direction, position);
        }
      }

      // add additional spacing around active element
      if (item.isBusy) {
        position += item.spacing * 2;
      }

      if (direction === 'grid') {
        if (item.height > maxPrevHeight) {
          maxPrevHeight = item.height;
        }

        position += item.width;
      }
      if (direction === 'x') {
        position += item.width;
      }
      if (direction === 'y') {
        position += item.height;
      }
    });
  }

  /**
   @method _commit
   */
  @action
  commit(): void {
    const items = this.sortedItems;
    const itemModels = items.map((item) => item.model);
    const draggedItem = items.find((item) => item.wasDropped);
    let draggedModel;

    if (draggedItem) {
      draggedItem.wasDropped = false; // Reset
      draggedModel = draggedItem.model;
    }

    this._updateItems();
    this._onChange(itemModels, draggedModel);
  }

  @action
  _onChange(itemModels: T[], draggedModel: T | undefined): void {
    if (this.onChange) {
      this.onChange(itemModels, draggedModel);
    }
  }

  /**
   * Keeps the UI in sync with actual changes.
   * Needed for drag and keyboard operations.
   */
  _updateItems(): void {
    const items = this.sortedItems;

    delete this._firstItemPosition;

    schedule('render', () => {
      items.forEach((item) => item.freeze());
    });

    schedule('afterRender', () => {
      items.forEach((item) => item.reset());
    });

    next(() => {
      schedule('render', () => {
        items.forEach((item) => item.thaw());
      });
    });
  }

  @action
  _createAnnouncer(): HTMLSpanElement {
    const announcer = document.createElement('span');
    announcer.setAttribute('aria-live', 'polite');
    announcer.classList.add('visually-hidden');
    return announcer;
  }

  _calculateGridPosition(
    a: SortableItemModifier<T>,
    b: SortableItemModifier<T>,
    groupWidth: number,
  ): {
    ax: number;
    ay: number;
    bx: number;
    by: number;
  } {
    const groupTopPos = (a.element.parentNode as HTMLElement | null)?.offsetTop ?? 0;
    const groupLeftPos = (a.element.parentNode as HTMLElement | null)?.offsetLeft ?? 0;

    const position = {
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
    };

    if (a.isDragging) {
      const dragItemPos = this._calculateGridDragItemPos(
        position.ax,
        position.ay,
        position.bx,
        position.by,
        b.width,
        b.height,
        a.moveDirection,
        groupTopPos,
        groupLeftPos,
        groupWidth,
      );
      position.ax = dragItemPos.x;
      position.ay = dragItemPos.y;
    } else if (b.isDragging) {
      const dragItemPos = this._calculateGridDragItemPos(
        position.bx,
        position.by,
        position.ax,
        position.ay,
        a.width,
        a.height,
        b.moveDirection,
        groupTopPos,
        groupLeftPos,
        groupWidth,
      );
      position.bx = dragItemPos.x;
      position.by = dragItemPos.y;
    }

    // Math.hypot needs always a positive number (-5 = 5 in hypot).
    // As a negative number will be positive, we need to fake position from non dragged element
    if (a.isDragging && position.ax <= 0) {
      position.ax = 0;
      position.bx = 1;
    }

    if (b.isDragging && position.bx <= 0) {
      position.bx = 0;
      position.ax = 1;
    }

    return position;
  }

  _calculateGridDragItemPos(
    x: number,
    y: number,
    otherX: number,
    otherY: number,
    width: number,
    height: number,
    moveDirection: MoveDirection,
    groupTopPos: number,
    groupLeftPos: number,
    groupWidth: number,
  ): Position {
    const toleranceWidth = width / 4;
    const initialX = x;

    if (moveDirection.left) {
      x = x - toleranceWidth;
    }

    if (moveDirection.right) {
      x = x + toleranceWidth;
      // Calculate the maximum of items in row & the maximal x-position of last item
      const itemsPerRow = Math.floor(groupWidth / width);
      const possibleLastItemPos = (itemsPerRow - 1) * width + groupLeftPos;
      if (otherX > initialX && x + width > possibleLastItemPos - 1) {
        // Removing one pixel is necessary to move drag item before other element
        x = possibleLastItemPos - 1;
      }
    }

    if (y < groupTopPos) {
      y = groupTopPos;
    }

    const toleranceHeight = height / 4;

    // When item is moved a quarter of height to top, user wants to move up
    if (moveDirection.top && y - height + toleranceHeight <= otherY && y >= otherY) {
      y = otherY;
      // tolerance that it doesn't jump directly in previews line
    } else if (moveDirection.top && y >= otherY - toleranceHeight && y <= otherY) {
      y = otherY;
    }

    // When item is moved a quarter of height to bottom, user wants to move down
    if (moveDirection.bottom && y <= otherY + height - toleranceHeight && y >= otherY) {
      y = otherY;
      // tolerance that it doesn't jump directly in next line
    } else if (moveDirection.bottom && y > otherY - toleranceHeight && y <= otherY) {
      y = otherY;
    }

    return {
      x: x,
      y: y,
    };
  }

  // end of API

  addEventListener(): void {
    this.element.addEventListener('keydown', this.keyDown);
    this.element.addEventListener('focusout', this.focusOut);
  }

  removeEventListener(): void {
    this.element.removeEventListener('keydown', this.keyDown);
    this.element.removeEventListener('focusout', this.focusOut);
  }

  element!: HTMLElement;
  didSetup = false;
  named!: NamedArgs<SortableGroupModifierSignature<T>>;

  constructor(owner: Owner, args: ArgsFor<SortableGroupModifierSignature<T>>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  override modify(
    element: HTMLElement,
    _positional: PositionalArgs<SortableGroupModifierSignature<T>>,
    named: NamedArgs<SortableGroupModifierSignature<T>>,
  ) {
    this.element = element;
    this.named = named;

    this.removeEventListener();

    if (!this.didSetup) {
      this._groupDef = this.sortableService.fetchGroup(this.groupName);
      this.announcer = this._createAnnouncer();
      this.element.insertAdjacentElement('afterend', this.announcer);
      this.sortableService.registerGroup(this.groupName, this);

      this.didSetup = true;
    }

    if (this.disabled) {
      return;
    }

    this.addEventListener();
  }
}

/**
 *
 * @param {SortableGroupModifier} instance
 */
function cleanup<T>(instance: SortableGroupModifier<T>) {
  // todo cleanup the announcer
  if (instance.announcer?.parentNode) {
    instance.announcer.parentNode.removeChild(instance.announcer);
  }
  instance.removeEventListener();
  instance.sortableService.deregisterGroup(instance.groupName);
}
