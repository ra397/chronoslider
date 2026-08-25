/**
 * ChronoSlider — a dependency-free, zoomable, pannable timeline range picker.
 *
 *   import { ChronoSlider } from './chronoslider.js';
 *
 *   const slider = new ChronoSlider(document.getElementById('timeline'), new Date(), 'day');
 *   slider.onRangeSelected((start, end) => console.log(start, end));
 *
 * Requires chronoslider.css.
 */

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

const RESOLUTIONS = ['year', 'month', 'day', 'hour'];

/** Pixels between two adjacent ticks, per resolution. */
const TICK_PX = {
    year: 14,   // one tick = one month
    month: 13,  // one tick = one day
    day: 13,    // one tick = one hour
    hour: 13,   // one tick = five minutes
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MS_PER_DAY = 86400000;
const DRAG_THRESHOLD = 5;     // px of movement before a press becomes a drag
const CLICK_DELAY = 220;      // ms a click waits to see if it is really a double-click
const WHEEL_COOLDOWN = 130;   // ms between zoom steps
const WHEEL_THRESHOLD = 24;   // accumulated deltaY needed for one zoom step
const RENDER_BUFFER = 2;      // extra ticks rendered beyond each edge

/* ------------------------------------------------------------------ *
 * Calendar helpers
 *
 * Every resolution defines a unit (month / day / hour / 5 minutes) and an
 * integer index space over those units. Ticks are always built from real
 * calendar fields via the Date constructor, never by adding fixed
 * millisecond amounts, so month lengths, leap years and DST are handled by
 * the platform's calendar rather than by arithmetic assumptions.
 * ------------------------------------------------------------------ */

const fdiv = (a, b) => Math.floor(a / b);
const fmod = (a, b) => a - fdiv(a, b) * b;
const pad2 = (n) => String(n).padStart(2, '0');

/** Build a local Date from calendar fields, tolerating out-of-range values. */
function makeDate(year, month, day, hours = 0, minutes = 0) {
    const d = new Date(2000, 0, 1, 0, 0, 0, 0);
    d.setFullYear(year, month, day);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

/** Whole days between the local midnight of `date` and 1970-01-01. */
function dayIndex(date) {
    return Math.round(
        (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1970, 0, 1)) / MS_PER_DAY
    );
}

/** Integer index of the tick containing `date`. */
function unitIndex(date, resolution) {
    switch (resolution) {
        case 'year': return date.getFullYear() * 12 + date.getMonth();
        case 'month': return dayIndex(date);
        case 'day': return dayIndex(date) * 24 + date.getHours();
        case 'hour': return dayIndex(date) * 288 + date.getHours() * 12 + fdiv(date.getMinutes(), 5);
    }
}

/** Start date of the tick with integer index `i`. */
function indexToDate(i, resolution) {
    switch (resolution) {
        case 'year': return makeDate(fdiv(i, 12), fmod(i, 12), 1);
        case 'month': return makeDate(1970, 0, 1 + i);
        case 'day': return makeDate(1970, 0, 1 + fdiv(i, 24), fmod(i, 24));
        case 'hour': return makeDate(1970, 0, 1 + fdiv(i, 288), 0, fmod(i, 288) * 5);
    }
}

/** Continuous index of `date`: the tick index plus the fraction elapsed inside it. */
function fractionalIndex(date, resolution) {
    const i = unitIndex(date, resolution);
    const start = indexToDate(i, resolution).getTime();
    const span = indexToDate(i + 1, resolution).getTime() - start;
    if (span <= 0) return i;
    return i + (date.getTime() - start) / span;
}

/** Inverse of fractionalIndex. */
function dateFromFractionalIndex(f, resolution) {
    const i = Math.floor(f);
    const start = indexToDate(i, resolution).getTime();
    const span = indexToDate(i + 1, resolution).getTime() - start;
    return new Date(start + (f - i) * Math.max(span, 0));
}

/**
 * False when an index names a local wall-clock time that does not exist —
 * the hour skipped by a spring-forward DST transition. Such a slot is left
 * blank rather than rendered as a duplicate of the following hour.
 */
function tickExists(index, date, resolution) {
    if (resolution !== 'day' && resolution !== 'hour') return true;
    return unitIndex(date, resolution) === index;
}

/** True when a tick carries a prominent label at this resolution. */
function isMajorTick(date, resolution) {
    switch (resolution) {
        case 'year': return date.getMonth() === 0;
        case 'month': return date.getDate() === 1;
        case 'day': return date.getHours() === 0;
        case 'hour': return date.getMinutes() === 0;
    }
}

/** The label on a major tick: the boundary it marks. */
function majorLabel(date, resolution) {
    switch (resolution) {
        case 'year': return String(date.getFullYear());
        case 'month': return MONTHS[date.getMonth()];
        case 'day': return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
        case 'hour': return `${pad2(date.getHours())}:00`;
    }
}

/** The quieter second line: the period that encloses the labelled boundary. */
function contextLabel(date, resolution) {
    switch (resolution) {
        case 'year': return '';
        case 'month': return String(date.getFullYear());
        case 'day': return String(date.getFullYear());
        case 'hour': return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
    }
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export class ChronoSlider {
    constructor(container, centerDate, resolution) {
        if (!container || typeof container.appendChild !== 'function') {
            throw new TypeError('ChronoSlider: container must be a DOM element.');
        }
        if (!(centerDate instanceof Date) || Number.isNaN(centerDate.getTime())) {
            throw new TypeError('ChronoSlider: centerDate must be a valid Date.');
        }
        if (!RESOLUTIONS.includes(resolution)) {
            throw new TypeError(`ChronoSlider: resolution must be one of ${RESOLUTIONS.join(', ')}.`);
        }

        /* --- timeline state --- */
        this.container = container;
        this.resolution = resolution;
        this.centerDate = new Date(centerDate.getTime());
        this.startTick = null;
        this.endTick = null;

        this._centerIndex = fractionalIndex(this.centerDate, resolution);
        this._width = 0;
        this._callback = null;
        this._lastEmitted = null;

        /* --- interaction state --- */
        this._pointerId = null;
        this._pressX = 0;
        this._pressY = 0;
        this._pressCenterIndex = 0;
        this._dragging = false;
        this._suppressClick = false;
        this._clickTimer = 0;
        this._wheelAccum = 0;
        this._wheelAt = 0;
        this._zoomedAt = 0;
        this._raf = 0;
        this._tickPool = [];

        this._buildDom();
        this._bindEvents();
        this._observeResize();
        this._measure();
        this._render();
    }

    /* -------------------------------------------------------------- *
     * Public API
     * -------------------------------------------------------------- */

    /** Register the range callback. Called only when a complete range changes. */
    onRangeSelected(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('ChronoSlider: onRangeSelected expects a function.');
        }
        this._callback = callback;
        return this;
    }

    /** Current selection as `{ start, end }`; either value may be null. */
    getSelection() {
        return {
            start: this.startTick ? new Date(this.startTick.getTime()) : null,
            end: this.endTick ? new Date(this.endTick.getTime()) : null,
        };
    }

    /** Drop both selections without firing the range callback. */
    clearSelection() {
        this.startTick = null;
        this.endTick = null;
        this._lastEmitted = null;
        this._render();
    }

    /** Remove listeners and DOM. The instance is unusable afterwards. */
    destroy() {
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this._clickTimer) clearTimeout(this._clickTimer);
        if (this._resizeObserver) this._resizeObserver.disconnect();
        else window.removeEventListener('resize', this._onWindowResize);
        this.root.remove();
        this._tickPool = [];
        this._callback = null;
    }

    /* -------------------------------------------------------------- *
     * DOM
     * -------------------------------------------------------------- */

    _buildDom() {
        const el = (cls, tag = 'div') => {
            const node = document.createElement(tag);
            node.className = cls;
            return node;
        };

        this.root = el('chronoslider');
        this.viewport = el('chronoslider__viewport');
        this.range = el('chronoslider__range');
        this.axis = el('chronoslider__axis');
        this.track = el('chronoslider__track');
        this.startMarker = el('chronoslider__marker chronoslider__marker--start');
        this.endMarker = el('chronoslider__marker chronoslider__marker--end');

        this.viewport.append(this.range, this.axis, this.track, this.startMarker, this.endMarker);
        this.root.append(this.viewport);
        this.container.append(this.root);
    }

    _createTick() {
        const tick = document.createElement('div');
        tick.className = 'chronoslider__tick';
        const label = document.createElement('span');
        label.className = 'chronoslider__label';
        const context = document.createElement('span');
        context.className = 'chronoslider__context';
        tick.append(label, context);
        this.track.append(tick);
        return { el: tick, label, context, major: null, labelText: '', contextText: '' };
    }

    /* -------------------------------------------------------------- *
     * Geometry
     * -------------------------------------------------------------- */

    get _pxPerUnit() {
        return TICK_PX[this.resolution];
    }

    _measure() {
        this._width = this.viewport.clientWidth;
    }

    /** Horizontal pixel position of a date within the viewport. */
    _xForDate(date) {
        return this._width / 2 + (fractionalIndex(date, this.resolution) - this._centerIndex) * this._pxPerUnit;
    }

    /** Continuous index at a horizontal pixel position. */
    _indexForX(x) {
        return this._centerIndex + (x - this._width / 2) / this._pxPerUnit;
    }

    /** The tick nearest to a horizontal pixel position. */
    _tickAtX(x) {
        return indexToDate(Math.round(this._indexForX(x)), this.resolution);
    }

    _localX(event) {
        return event.clientX - this.viewport.getBoundingClientRect().left;
    }

    /* -------------------------------------------------------------- *
     * Rendering
     * -------------------------------------------------------------- */

    _scheduleRender() {
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._render();
        });
    }

    _render() {
        if (!this._width) {
            this._measure();
            if (!this._width) return;
        }
        this._renderTicks();
        this._renderSelection();
    }

    _renderTicks() {
        const px = this._pxPerUnit;
        const half = this._width / 2;
        const reach = half / px + RENDER_BUFFER;
        const from = Math.floor(this._centerIndex - reach);
        const to = Math.ceil(this._centerIndex + reach);
        const needed = to - from + 1;

        while (this._tickPool.length < needed) this._tickPool.push(this._createTick());

        for (let n = 0; n < this._tickPool.length; n++) {
            const slot = this._tickPool[n];
            const index = from + n;
            const date = n < needed ? indexToDate(index, this.resolution) : null;
            const visible = n < needed && tickExists(index, date, this.resolution);

            if (!visible) {
                if (slot.el.style.display !== 'none') slot.el.style.display = 'none';
                continue;
            }
            if (slot.el.style.display === 'none') slot.el.style.display = '';

            // const x = half + (index - this._centerIndex) * px;
            const x = half + (index - this._centerIndex) * px;

            slot.el.style.transform = `translateX(${x.toFixed(2)}px)`;

            const major = isMajorTick(date, this.resolution);
            if (slot.major !== major) {
                slot.el.classList.toggle('chronoslider__tick--major', major);
                slot.major = major;
            }

            const label = major ? majorLabel(date, this.resolution) : '';
            if (slot.labelText !== label) {
                slot.label.textContent = label;
                slot.labelText = label;
            }

            const context = major ? contextLabel(date, this.resolution) : '';
            if (slot.contextText !== context) {
                slot.context.textContent = context;
                slot.contextText = context;
            }
        }
    }

    _renderSelection() {
        this._placeMarker(this.startMarker, this.startTick);
        this._placeMarker(this.endMarker, this.endTick);

        if (this.startTick && this.endTick) {
            const a = this._xForDate(this.startTick);
            const b = this._xForDate(this.endTick);
            const left = Math.max(Math.min(a, b), -32);
            const right = Math.min(Math.max(a, b), this._width + 32);
            this.range.style.transform = `translateX(${left.toFixed(2)}px)`;
            this.range.style.width = `${Math.max(right - left, 0).toFixed(2)}px`;
            this.range.classList.add('chronoslider__range--visible');
        } else {
            this.range.classList.remove('chronoslider__range--visible');
        }
    }

    _placeMarker(marker, date) {
        if (!date) {
            marker.classList.remove('chronoslider__marker--visible');
            return;
        }
        marker.style.transform = `translateX(${this._xForDate(date).toFixed(2)}px)`;
        marker.classList.add('chronoslider__marker--visible');
    }

    /* -------------------------------------------------------------- *
     * Selection
     * -------------------------------------------------------------- */

    /**
     * Apply a click on `tick` to the current selection.
     * Pure state transition — see the rules in the spec.
     */
    _selectTick(tick) {
        const s = this.startTick;
        const e = this.endTick;
        const same = (a, b) => a && b && a.getTime() === b.getTime();

        let ns = s;
        let ne = e;

        if (same(tick, s)) {
            ns = null;                                   // unselect the start
        } else if (same(tick, e)) {
            ne = null;                                   // unselect the end
        } else if (!s && !e) {
            ns = tick;                                   // first selection
        } else if (s && !e) {
            if (tick.getTime() > s.getTime()) ne = tick; // click after the start
            else { ns = tick; ne = s; }                  // click before the start
        } else if (!s && e) {
            ns = tick;                                   // defensive: only an end exists
        } else {
            const toStart = Math.abs(tick.getTime() - s.getTime());
            const toEnd = Math.abs(tick.getTime() - e.getTime());
            if (toStart <= toEnd) ns = tick;             // move the nearer marker
            else ne = tick;
        }

        // Normalize: keep start <= end, and collapse a lone end into the start.
        if (ns && ne && ns.getTime() > ne.getTime()) [ns, ne] = [ne, ns];
        if (!ns && ne) { ns = ne; ne = null; }

        this._applySelection(ns, ne);
    }

    _applySelection(start, end) {
        this.startTick = start;
        this.endTick = end;
        this._render();

        if (start && end) {
            const key = `${start.getTime()}:${end.getTime()}`;
            if (key !== this._lastEmitted) {
                this._lastEmitted = key;
                if (this._callback) {
                    this._callback(new Date(start.getTime()), new Date(end.getTime()));
                }
            }
        } else {
            this._lastEmitted = null;
        }
    }

    /* -------------------------------------------------------------- *
     * Zooming
     * -------------------------------------------------------------- */

    /** The date that must stay visually still during a zoom. */
    _zoomAnchor(mouseX) {
        if (this.startTick && this.endTick) {
            return new Date((this.startTick.getTime() + this.endTick.getTime()) / 2);
        }
        if (this.startTick) return this.startTick;
        if (this.endTick) return this.endTick;
        return dateFromFractionalIndex(this._indexForX(mouseX), this.resolution);
    }

    _zoom(direction, mouseX) {
        const level = RESOLUTIONS.indexOf(this.resolution) + direction;
        if (level < 0 || level >= RESOLUTIONS.length) return;

        const anchor = this._zoomAnchor(mouseX);
        const anchorX = this._xForDate(anchor);

        this.resolution = RESOLUTIONS[level];
        this._centerIndex = fractionalIndex(anchor, this.resolution)
            - (anchorX - this._width / 2) / this._pxPerUnit;
        this._syncCenterDate();

        // Every label changes meaning at a new resolution; force a full refresh.
        for (const slot of this._tickPool) {
            slot.major = null;
            slot.labelText = null;
            slot.contextText = null;
        }
        this.root.dataset.resolution = this.resolution;
        this._render();
    }

    _syncCenterDate() {
        this.centerDate = dateFromFractionalIndex(this._centerIndex, this.resolution);
    }

    /* -------------------------------------------------------------- *
     * Interaction
     * -------------------------------------------------------------- */

    _bindEvents() {
        this.root.dataset.resolution = this.resolution;

        this._onPointerDown = (e) => {
            if (e.button !== 0 || this._pointerId !== null) return;
            this._pointerId = e.pointerId;
            this._pressX = e.clientX;
            this._pressY = e.clientY;
            this._pressCenterIndex = this._centerIndex;
            this._dragging = false;
            this.viewport.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        this._onPointerMove = (e) => {
            if (e.pointerId !== this._pointerId) return;
            const dx = e.clientX - this._pressX;
            const dy = e.clientY - this._pressY;

            if (!this._dragging) {
                if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
                this._dragging = true;
                this.root.classList.add('chronoslider--panning');
            }
            // Dragging left (dx < 0) moves the timeline forward in time.
            this._centerIndex = this._pressCenterIndex - dx / this._pxPerUnit;
            this._scheduleRender();
        };

        this._onPointerUp = (e) => {
            if (e.pointerId !== this._pointerId) return;
            this.viewport.releasePointerCapture(e.pointerId);
            this._pointerId = null;
            if (this._dragging) {
                this._dragging = false;
                this._suppressClick = true;   // a pan must never select a tick
                this.root.classList.remove('chronoslider--panning');
                this._syncCenterDate();       // stay exactly where the user let go
            }
        };

        this._onClick = (e) => {
            if (this._suppressClick) { this._suppressClick = false; return; }
            if (e.detail > 1) return;         // second click of a double-click
            const x = this._localX(e);
            clearTimeout(this._clickTimer);
            this._clickTimer = setTimeout(() => {
                this._clickTimer = 0;
                this._selectTick(this._tickAtX(x));
            }, CLICK_DELAY);
        };

        this._onDblClick = () => {
            clearTimeout(this._clickTimer);
            this._clickTimer = 0;
            this.clearSelection();
        };

        this._onWheel = (e) => {
            e.preventDefault();
            if (this._dragging) return;

            const now = performance.now();
            if (now - this._wheelAt > 300) this._wheelAccum = 0;
            this._wheelAccum += e.deltaY;
            this._wheelAt = now;

            if (now - this._zoomedAt < WHEEL_COOLDOWN) return;
            if (Math.abs(this._wheelAccum) < WHEEL_THRESHOLD) return;

            const direction = this._wheelAccum < 0 ? 1 : -1;  // scroll up zooms in
            this._wheelAccum = 0;
            this._zoomedAt = now;
            this._zoom(direction, this._localX(e));
        };

        this.viewport.addEventListener('pointerdown', this._onPointerDown);
        this.viewport.addEventListener('pointermove', this._onPointerMove);
        this.viewport.addEventListener('pointerup', this._onPointerUp);
        this.viewport.addEventListener('pointercancel', this._onPointerUp);
        this.viewport.addEventListener('click', this._onClick);
        this.viewport.addEventListener('dblclick', this._onDblClick);
        this.viewport.addEventListener('wheel', this._onWheel, { passive: false });
    }

    _observeResize() {
        this._onWindowResize = () => {
            const before = this._width;
            this._measure();
            if (this._width !== before) this._scheduleRender();
        };

        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(() => {
                // Center, resolution and selection are all stored as time,
                // so nothing but the pixel geometry needs recomputing.
                this._measure();
                this._scheduleRender();
            });
            this._resizeObserver.observe(this.viewport);
        } else {
            window.addEventListener('resize', this._onWindowResize);
        }
    }
}

export default ChronoSlider;