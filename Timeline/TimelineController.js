class TimelineController {
    constructor(timelineInstance) {
        this.timeline = timelineInstance;
        this.timelineElement = document.getElementById('timeline');

        this.dragThreshold = 50;
        this.isDragging = false;
        this.lastX = 0;
        this.accumulatedDelta = 0;

        this.startDate = null;
        this.endDate = null;

        this._rangeSelectedCallback = null; // callback when a user has selected date range

        this._bindEvents();
    }

    onRangeSelected(callback) {
        this._rangeSelectedCallback = callback;
    }

    _bindEvents() {
        let clickTimeout = null;

        // Double-click zoom in
        this.timelineElement.addEventListener('dblclick', (e) => {
            if (clickTimeout) {
                clearTimeout(clickTimeout); // Cancel pending click action
                clickTimeout = null;
            }

            const zoomToDate = this._getZoomDate(e);
            if (!zoomToDate) return;

            this.timeline.zoom('in', zoomToDate);
        });

        // Scroll wheel to zoom out
        this.timelineElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.timeline.zoom('out');
        });

        // Drag to pan
        this.timelineElement.addEventListener('mousedown', this._onMouseDown.bind(this));
        document.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('mouseup', this._onMouseUp.bind(this));

        // Select start and end time with single-click
        this.timelineElement.addEventListener('click', (e) => {
            if (e.detail > 1) return; // ignore if dblclick

            const unitElem = e.target.closest('.timeline-unit');
            if (!unitElem || !this.timelineElement.contains(unitElem)) return;


            clickTimeout = setTimeout(() => {
                const clickedDate = new Date(unitElem.getAttribute('date'));

                if (!this.startDate || (this.startDate && this.endDate)) {
                    this.startDate = clickedDate;
                    this.endDate = null;
                } else {
                    if (clickedDate < this.startDate) {
                        this.endDate = this.startDate;
                        this.startDate = clickedDate;
                    } else {
                        this.endDate = clickedDate;
                    }
                }

                if (this.startDate && this.endDate) {
                    if (this._rangeSelectedCallback) {
                        this._rangeSelectedCallback({ startDate: this.startDate, endDate: this.endDate });
                    }
                }

                clickTimeout = null;
            }, 250);
        });
    }

    _onMouseDown(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.accumulatedDelta = 0;
        this.timelineElement.classList.add('dragging');
    }

    _onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastX;
        this.accumulatedDelta += deltaX;
        this.lastX = e.clientX;

        if (Math.abs(this.accumulatedDelta) >= this.dragThreshold) {
            const direction = this.accumulatedDelta > 0 ? 'left' : 'right';
            this.timeline.pan(direction);
            this.accumulatedDelta = 0;
        }
    }

    _onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.timelineElement.classList.remove('dragging');
        }
    }

    _getZoomDate(event) {
        const unitElem = event.target.closest('.timeline-unit');
        if (!unitElem) return null;
        const isoDate = unitElem.getAttribute('date');
        return new Date(isoDate);
    }
}
window.TimelineController = TimelineController;