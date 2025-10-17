class Timeline {
    constructor() {
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.state = {
            resolution: "year",
            startDate: new Date(2016, 0, 1, 0),
        }
    }

    getUnits(startDate, resolution, count) {
        let ticks = [];
        let date;

        for (let i = 0; i < count; i++) {
            switch (resolution) {
                case 'year': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);

                    let label = {
                        smallText: '',
                        largeText: ''
                    };

                    if (date.getMonth() === 0) {
                        label.largeText = date.getFullYear().toString();
                    }

                    ticks.push({
                        date: date,
                        label: label,
                    });
                    break;
                }

                case 'month': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);

                    let label = {
                        smallText: '',
                        largeText: ''
                    };

                    if (date.getDate() === 1) {
                        label.smallText = date.getFullYear().toString();
                        label.largeText = date.toLocaleString('default', { month: 'short' });
                    }

                    ticks.push({
                        date: date,
                        label: label,
                    });
                    break;
                }

                case 'day': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours() + i);

                    let label = {
                        smallText: '',
                        largeText: ''
                    };

                    if (date.getHours() === 0) {
                        label.smallText = date.getFullYear().toString();
                        label.largeText = date.toLocaleDateString('default', {
                            month: 'short',
                            day: '2-digit',
                        });
                    }

                    ticks.push({
                        date: date,
                        label: label,
                    });
                    break;
                }

                case 'hour': {
                    date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes() + i * 5);

                    let label = {
                        smallText: '',
                        largeText: ''
                    };

                    if (date.getMinutes() === 0) {
                        label.smallText = date.toLocaleDateString('default', {
                            month: 'short',
                            day: '2-digit',
                        });
                        label.largeText = date.toLocaleTimeString('default', {
                            hour: 'numeric',
                            hour12: true,
                        });                    }

                    ticks.push({
                        date: date,
                        label: label,
                    });
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
        const timelineElem = document.getElementById('timeline');
        const unitWidth = 15;
        const numUnitsToShow = Math.floor(timelineElem.offsetWidth / unitWidth);
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
            // Center hoverDate in new view
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
            // Estimate current center of visible units
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

            // Now center that date in the new (zoomed-out) resolution
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

    // returns the number of ticks to show based on the width of the timeline
    getNumUnitsToShow() {
        const timeline = document.getElementById('timeline');
        return Math.floor(timeline.offsetWidth / 15);
    }

    render() {
        // TODO: don't hardcode 15px width

        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        const { startDate, resolution} = this.state;

        // calculate the number of ticks based on timeline width
        const numUnitsToShow = this.getNumUnitsToShow();

        // get units
        const units = this.getUnits(startDate, resolution, numUnitsToShow);

        // generate ticks from units
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
            labelContainerElem.style.width = '15px';

            labelContainerElem.appendChild(largeTextElem);
            labelContainerElem.appendChild(smallTextElem);
            unitElem.appendChild(labelContainerElem);
            timeline.appendChild(unitElem);
        });

        // place markers
        const startMarkerEl = document.getElementById('start-marker');
        const stopMarkerEl = document.getElementById('stop-marker');
        const rangeBeginning = units[0].date;
        const rangeEnd = units[units.length - 1].date;
        const totalDuration = rangeEnd - rangeBeginning;
        if (this.selectedStartDate) {
            const elapsedDuration = this.selectedStartDate - rangeBeginning;
            const percentage = (elapsedDuration / totalDuration) * 100;
            if (percentage > 100 || percentage < 0) {
                startMarkerEl.style.display = 'none';
            } else {
                startMarkerEl.style.left = `calc(${percentage}% - ${(elapsedDuration / totalDuration) * 15}px)`;
                startMarkerEl.style.display = 'inline-block';
            }
        } else {
            startMarkerEl.style.display = 'none';
        }
        if (this.selectedEndDate) {
            const elapsedDuration = this.selectedEndDate - rangeBeginning;
            const percentage = (elapsedDuration / totalDuration) * 100;
            if (percentage > 100 || percentage < 0) { // is it in range?
                stopMarkerEl.style.display = 'none';
            } else {
                stopMarkerEl.style.left = `calc(${percentage}% - ${(elapsedDuration / totalDuration) * 15}px)`;
                stopMarkerEl.style.display = 'inline-block';
            }
        } else {
            stopMarkerEl.style.display = 'none';
        }
    }
}
window.Timeline = Timeline;