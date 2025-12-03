class ChronosliderController {
    constructor(timeline) {
        this.timeline = timeline;
        this.timelineElement = timeline.timelineElement;

        this.dragThreshold = timeline.unitWidth;
        this.isDragging = false;
        this.lastX = 0;
        this.accumulatedDelta = 0;
        this.clickTimeout = null;

        // Store bound handlers for removal
        this._onClickHandler = this._onClick.bind(this);
        this._onDblClickHandler = this._onDblClick.bind(this);
        this._onWheelHandler = this._onWheel.bind(this);
        this._onMouseDownHandler = this._onMouseDown.bind(this);
        this._onMouseMoveHandler = this._onMouseMove.bind(this);
        this._onMouseUpHandler = this._onMouseUp.bind(this);

        this._bindEvents();
    }

    _bindEvents() {
        this.timelineElement.addEventListener('click', this._onClickHandler);
        this.timelineElement.addEventListener('dblclick', this._onDblClickHandler);
        this.timelineElement.addEventListener('wheel', this._onWheelHandler, { passive: false });
        this.timelineElement.addEventListener('mousedown', this._onMouseDownHandler);
        document.addEventListener('mousemove', this._onMouseMoveHandler);
        document.addEventListener('mouseup', this._onMouseUpHandler);

        this._resizeObserver = new ResizeObserver(() => {
            this.timeline.render();
        });
        this._resizeObserver.observe(this.timelineElement);
    }

    destroy() {
        this.timelineElement.removeEventListener('click', this._onClickHandler);
        this.timelineElement.removeEventListener('dblclick', this._onDblClickHandler);
        this.timelineElement.removeEventListener('wheel', this._onWheelHandler);
        this.timelineElement.removeEventListener('mousedown', this._onMouseDownHandler);
        document.removeEventListener('mousemove', this._onMouseMoveHandler);
        document.removeEventListener('mouseup', this._onMouseUpHandler);

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
    }

    _onClick(e) {
        if (e.detail > 1) return;

        const unitElem = e.target.closest('.timeline-unit');
        if (!unitElem || !this.timelineElement.contains(unitElem)) return;

        this.clickTimeout = setTimeout(() => {
            const clickedDate = new Date(unitElem.getAttribute('date'));

            if (!this.timeline.getStartDate() && !this.timeline.getEndDate()) {
                this.timeline.setStartDate(clickedDate);
            }
            else if (this.timeline.getStartDate() && !this.timeline.getEndDate()) {
                if (clickedDate.getTime() === this.timeline.getStartDate().getTime()) {
                    this.timeline.clearStartDate();
                } else {
                    if (clickedDate.getTime() < this.timeline.getStartDate().getTime()) {
                        this.timeline.setEndDate(this.timeline.getStartDate());
                        this.timeline.setStartDate(clickedDate);
                    } else {
                        this.timeline.setEndDate(clickedDate);
                    }
                    if (this.timeline._rangeSelectedCallback) {
                        this.timeline._rangeSelectedCallback({
                            startDate: this.timeline.getStartDate(),
                            endDate: this.timeline.getEndDate()
                        });
                    }
                }
            }
            else if (this.timeline.getStartDate() && this.timeline.getEndDate()) {
                if (clickedDate.getTime() === this.timeline.getStartDate().getTime()) {
                    this.timeline.clearStartDate();
                    this.timeline.setStartDate(this.timeline.getEndDate());
                    this.timeline.clearEndDate();
                } else if (clickedDate.getTime() === this.timeline.getEndDate().getTime()) {
                    this.timeline.clearEndDate();
                }
            }
            else if (this.timeline.getEndDate() && !this.timeline.getStartDate()) {
                if (clickedDate.getTime() > this.timeline.getEndDate().getTime()) {
                    this.timeline.setEndDate(this.timeline.getStartDate());
                    this.timeline.setStartDate(clickedDate);
                } else if (clickedDate.getTime() < this.timeline.getEndDate().getTime()) {
                    this.timeline.setStartDate(clickedDate);
                } else {
                    this.timeline.clearEndDate();
                }
            }
            this.clickTimeout = null;
        }, 333);
    }

    _onDblClick(e) {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }

        const zoomToDate = this._getZoomDate(e);
        if (!zoomToDate) return;

        this.timeline.zoom('in', zoomToDate);
    }

    _onWheel(e) {
        if (e.deltaY < 0) {
            e.preventDefault();

            const timelineSpans = this.timelineElement.children;
            if (timelineSpans.length === 0) return;

            const middleTimeSpan = timelineSpans[Math.floor((timelineSpans.length - 1) / 2)];
            const isoDate = middleTimeSpan.getAttribute('date');
            const zoomToDate = new Date(isoDate);

            this.timeline.zoom('in', zoomToDate);
        } else if (e.deltaY > 0) {
            e.preventDefault();
            this.timeline.zoom('out');
        }
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

export class Chronoslider {
    constructor(container, options = {}) {
        if (typeof container === 'string') {
            this.container = document.querySelector(container);
        } else {
            this.container = container;
        }

        if (!this.container) {
            throw new Error('Chronoslider: Invalid container provided');
        }

        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.state = {
            resolution: "year",
            startDate: new Date(2025, 0, 1, 0),
        }
        this.unitWidth = options.unitWidth || 15;
        this.color = options.color || '#000';

        this._rangeSelectedCallback = null;

        this._createElements();
        this._controller = new ChronosliderController(this);
        this.render();
    }

    _createElements() {
        this.container.classList.add('timeline-container');

        this.startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.startMarker.id = 'start-marker';
        this.startMarker.setAttribute('viewBox', '0 0 1 1');
        const startPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        startPolygon.setAttribute('points', '0,0 1,0 0.5,1');
        startPolygon.setAttribute('fill', 'green');
        this.startMarker.appendChild(startPolygon);

        this.stopMarker = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.stopMarker.id = 'stop-marker';
        this.stopMarker.setAttribute('viewBox', '0 0 1 1');
        const stopPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        stopPolygon.setAttribute('points', '0,0 1,0 0.5,1');
        stopPolygon.setAttribute('fill', 'red');
        this.stopMarker.appendChild(stopPolygon);

        this.line = document.createElement('div');
        this.line.id = 'line';

        this.timelineElement = document.createElement('div');
        this.timelineElement.id = 'timeline';

        this.container.appendChild(this.startMarker);
        this.container.appendChild(this.stopMarker);
        this.container.appendChild(this.line);
        this.container.appendChild(this.timelineElement);
    }

    onRangeSelected(callback) {
        this._rangeSelectedCallback = callback;
    }

    getUnits(startDate, resolution, count) {
        let ticks = [];
        let date;

        for (let i = 0; i < count; i++) {
            switch (resolution) {
                case 'year': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                    let label = { smallText: '', largeText: '' };
                    if (date.getMonth() === 0) {
                        label.largeText = date.getFullYear().toString();
                    }
                    ticks.push({ date: date, label: label });
                    break;
                }

                case 'month': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
                    let label = { smallText: '', largeText: '' };
                    if (date.getDate() === 1) {
                        label.smallText = date.getFullYear().toString();
                        label.largeText = date.toLocaleString('default', { month: 'short' });
                    }
                    ticks.push({ date: date, label: label });
                    break;
                }

                case 'day': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours() + i);
                    let label = { smallText: '', largeText: '' };
                    if (date.getHours() === 0) {
                        label.smallText = date.getFullYear().toString();
                        label.largeText = date.toLocaleDateString('default', {
                            month: 'short',
                            day: '2-digit',
                        });
                    }
                    ticks.push({ date: date, label: label });
                    break;
                }

                case 'hour': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes() + i * 5);
                    let label = { smallText: '', largeText: '' };
                    if (date.getMinutes() === 0) {
                        label.smallText = date.toLocaleDateString('default', {
                            month: 'short',
                            day: '2-digit',
                        });
                        label.largeText = date.toLocaleTimeString('default', {
                            hour: 'numeric',
                            hour12: true,
                        });
                    }
                    ticks.push({ date: date, label: label });
                    break;
                }

                default:
                    throw new Error(`Unsupported resolution: ${resolution}`);
            }
        }
        return ticks;
    }

    pan(direction) {
        const { resolution, startDate } = this.state;
        const newDate = new Date(startDate);
        const change = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;

        switch (resolution) {
            case 'year':
                newDate.setMonth(startDate.getMonth() + change);
                break;
            case 'month':
                newDate.setDate(startDate.getDate() + change);
                break;
            case 'day':
                newDate.setHours(startDate.getHours() + change);
                break;
            case 'hour':
                newDate.setMinutes(startDate.getMinutes() + change * 5);
                break;
            default:
                throw new Error('Unsupported resolution: ' + resolution);
        }
        this.state.startDate = newDate;
        this.render();
    }

    zoom(direction, hoverDate) {
        const resolutions = ['year', 'month', 'day', 'hour'];
        const { resolution, startDate } = this.state;
        const numUnitsToShow = Math.floor(this.timelineElement.offsetWidth / this.unitWidth);
        const halfCount = Math.floor(numUnitsToShow / 2);

        const currentIndex = resolutions.indexOf(resolution);
        let newIndex;

        if (direction === 'in') {
            if (currentIndex >= resolutions.length - 1) return;
            newIndex = currentIndex + 1;
        } else if (direction === 'out') {
            if (currentIndex <= 0) return;
            newIndex = currentIndex - 1;
        } else {
            throw new Error('Unsupported zoom direction: ' + direction);
        }

        const newResolution = resolutions[newIndex];
        let newStartDate = new Date(startDate);

        if (direction === 'in' && hoverDate) {
            const centerDate = new Date(hoverDate);
            switch (newResolution) {
                case 'year':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth() - halfCount, 1);
                    break;
                case 'month':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate() - halfCount);
                    break;
                case 'day':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate(), centerDate.getHours() - halfCount);
                    break;
                case 'hour':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate(), centerDate.getHours(), centerDate.getMinutes() - halfCount * 5);
                    break;
            }
        }

        if (direction === 'out') {
            let centerDate = new Date(startDate);
            switch (resolution) {
                case 'year':
                    centerDate.setMonth(centerDate.getMonth() + halfCount);
                    break;
                case 'month':
                    centerDate.setDate(centerDate.getDate() + halfCount);
                    break;
                case 'day':
                    centerDate.setHours(centerDate.getHours() + halfCount);
                    break;
                case 'hour':
                    centerDate.setMinutes(centerDate.getMinutes() + halfCount * 5);
                    break;
            }

            switch (newResolution) {
                case 'year':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth() - halfCount, 1);
                    break;
                case 'month':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate() - halfCount);
                    break;
                case 'day':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate(), centerDate.getHours() - halfCount);
                    break;
                case 'hour':
                    newStartDate = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate(), centerDate.getHours(), centerDate.getMinutes() - halfCount * 5);
                    break;
            }
        }

        this.state.resolution = newResolution;
        this.state.startDate = newStartDate;
        this.render();
    }

    setStartDate(date) {
        this.selectedStartDate = date;
        this.render();
    }

    getStartDate() {
        return this.selectedStartDate;
    }

    clearStartDate() {
        this.selectedStartDate = null;
        this.render();
    }

    setEndDate(date) {
        this.selectedEndDate = date;
        this.render();
    }

    getEndDate() {
        return this.selectedEndDate;
    }

    clearEndDate() {
        this.selectedEndDate = null;
        this.render();
    }

    getNumUnitsToShow() {
        return Math.floor(this.timelineElement.offsetWidth / this.unitWidth);
    }

    render() {
        this.container.style.setProperty('--unit-width', `${this.unitWidth}px`);
        this.container.style.setProperty('--timeline-color', this.color);
        this.timelineElement.innerHTML = '';

        const { startDate, resolution } = this.state;
        const numUnitsToShow = this.getNumUnitsToShow();
        const units = this.getUnits(startDate, resolution, numUnitsToShow);

        units.forEach(unit => {
            const unitElem = document.createElement('span');
            unitElem.className = 'timeline-unit';
            unitElem.setAttribute('date', unit.date.toISOString());

            if (unit.label.smallText !== '' || unit.label.largeText !== '') {
                unitElem.classList.add('long-tick');
            }

            const smallTextElem = document.createElement('span');
            smallTextElem.className = 'small-label';
            smallTextElem.innerHTML = unit.label.smallText;

            const largeTextElem = document.createElement('span');
            largeTextElem.className = 'large-label';
            largeTextElem.textContent = unit.label.largeText;

            const labelContainerElem = document.createElement('span');
            labelContainerElem.className = 'label-container';
            labelContainerElem.style.width = `${this.unitWidth}px`;

            labelContainerElem.appendChild(largeTextElem);
            labelContainerElem.appendChild(smallTextElem);
            unitElem.appendChild(labelContainerElem);
            this.timelineElement.appendChild(unitElem);
        });

        const rangeBeginning = units[0].date;
        const rangeEnd = units[units.length - 1].date;
        const totalDuration = rangeEnd - rangeBeginning;

        if (this.selectedStartDate) {
            const elapsedDuration = this.selectedStartDate - rangeBeginning;
            const percentage = (elapsedDuration / totalDuration) * 100;
            if (percentage > 100 || percentage < 0) {
                this.startMarker.style.display = 'none';
            } else {
                this.startMarker.style.left = `calc(${percentage}% - ${(elapsedDuration / totalDuration) * this.unitWidth}px)`;
                this.startMarker.style.display = 'inline-block';
            }
        } else {
            this.startMarker.style.display = 'none';
        }

        if (this.selectedEndDate) {
            const elapsedDuration = this.selectedEndDate - rangeBeginning;
            const percentage = (elapsedDuration / totalDuration) * 100;
            if (percentage > 100 || percentage < 0) {
                this.stopMarker.style.display = 'none';
            } else {
                this.stopMarker.style.left = `calc(${percentage}% - ${(elapsedDuration / totalDuration) * this.unitWidth}px)`;
                this.stopMarker.style.display = 'inline-block';
            }
        } else {
            this.stopMarker.style.display = 'none';
        }
    }

    destroy() {
        this._controller.destroy();
        this._controller = null;

        this.container.removeChild(this.startMarker);
        this.container.removeChild(this.stopMarker);
        this.container.removeChild(this.line);
        this.container.removeChild(this.timelineElement);
        this.container.classList.remove('timeline-container');

        this.startMarker = null;
        this.stopMarker = null;
        this.line = null;
        this.timelineElement = null;
        this._rangeSelectedCallback = null;
    }
}