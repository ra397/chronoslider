class TimelineController {
    constructor(timelineInstance) {
        this.timeline = timelineInstance;
        this.timelineElement = document.getElementById('timeline');

        this.dragThreshold = 50;
        this.isDragging = false;
        this.lastX = 0;
        this.accumulatedDelta = 0;

        this._bindEvents();
    }

    _bindEvents() {
        // Zoom with wheel
        this.timelineElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const hoverDate = this._getHoverDate(e);
            const direction = e.deltaY < 0 ? 'in' : 'out';
            this.timeline.zoom(direction, hoverDate);
        });

        // Drag to pan
        this.timelineElement.addEventListener('mousedown', this._onMouseDown.bind(this));
        document.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('mouseup', this._onMouseUp.bind(this));
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

    _getHoverDate(event) {
        const target = event.target;
        if (!target.classList.contains('timeline-unit')) return null;
        const isoDate = target.getAttribute('date');
        return new Date(isoDate);
    }
}
window.TimelineController = TimelineController;