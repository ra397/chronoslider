class Timeline {
    constructor() {
        this.state = {
            resolution: "year",
            startDate: new Date(2020, 0, 1, 0),
        }
        this.render();
    }

    getUnits(startDate, resolution, count) {
        const units = [];

        for (let i = 0; i < count; i++) {
            let date;
            let formattedDate = {
                smallText: '',
                largeText: ''
            }

            switch (resolution) {
                case 'year':
                    date = new Date(startDate.getFullYear() + i, 0, 1);
                    formattedDate.largeText = date.getFullYear().toString();

                    break;

                case 'month':
                    date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                    formattedDate.smallText = date.getFullYear().toString();
                    formattedDate.largeText = date.toLocaleString('default', { month: 'short' });
                    break;

                case 'week':
                    const start = new Date(startDate);
                    const day = start.getDay();
                    start.setDate(start.getDate() - day); // Align to start of week
                    start.setHours(0, 0, 0, 0);
                    date = new Date(start);
                    date.setDate(start.getDate() + i * 7);

                    formattedDate.smallText = date.getFullYear().toString();
                    formattedDate.largeText = date.toLocaleDateString('default', {
                        month: 'short',
                        day: '2-digit',
                    });
                    break;

                case 'day':
                    date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    formattedDate.smallText = date.getFullYear().toString();
                    formattedDate.largeText = date.toLocaleDateString('default', {
                        month: 'short',
                        day: '2-digit',
                    });
                    break;

                case 'hour':
                    date = new Date(startDate);
                    date.setHours(startDate.getHours() + i);
                    formattedDate.smallText = date.toLocaleDateString('default', {
                        month: 'short',
                        day: '2-digit',
                    });
                    formattedDate.largeText = date.toLocaleTimeString('default', {
                        hour: 'numeric',
                        hour12: true,
                    });
                    break;

                default:
                    throw new Error('Unsupported resolution: ' + resolution);
            }

            units.push({
                date: date,
                formattedDate: formattedDate
            });
        }

        return units;
    }

    pan(direction) {
        const { resolution, startDate } = this.state;
        const newDate = new Date(startDate);
        const change = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;

        switch (resolution) {
            case 'year':
                newDate.setFullYear(startDate.getFullYear() + change);
                break;
            case 'month':
                newDate.setMonth(startDate.getMonth() + change);
                break;
            case 'week':
                newDate.setDate(startDate.getDate() + change * 7);
                break;
            case 'day':
                newDate.setDate(startDate.getDate() + change);
                break;
            case 'hour':
                newDate.setHours(startDate.getHours() + change);
                break;
            default:
                throw new Error('Unsupported resolution: ' + resolution);
        }

        this.state.startDate = newDate;
        this.render();
    }

    zoom(direction, hoverDate) {
        const resolutions = ['year', 'month', 'week', 'day', 'hour'];
        const { resolution, startDate } = this.state;

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

        let newStartDate = startDate;

        // If zooming in, and a hoverDate is provided, use it as new startDate
        if (direction === 'in' && hoverDate) {
            newStartDate = new Date(hoverDate);
        }

        this.state.resolution = resolutions[newIndex];
        this.state.startDate = newStartDate;

        this.render();
    }

    render() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        const { startDate, resolution} = this.state;

        // calculate the number of ticks based on timeline width
        const numUnitsToShow = Math.floor(timeline.offsetWidth / 75);

        const units = this.getUnits(startDate, resolution, numUnitsToShow);

        units.forEach(unit => {
            const unitElem = document.createElement('span');
            unitElem.className = 'timeline-unit';
            unitElem.setAttribute('date', unit.date.toISOString());

            const smallTextElem = document.createElement('span');
            smallTextElem.className = 'small-label';
            smallTextElem.textContent = unit.formattedDate.smallText;

            const largeTextElem = document.createElement('span');
            largeTextElem.className = 'large-label';
            largeTextElem.textContent = unit.formattedDate.largeText;

            const labelContainerElem = document.createElement('span');
            labelContainerElem.className = 'label-container';

            labelContainerElem.appendChild(smallTextElem);
            labelContainerElem.appendChild(largeTextElem);
            unitElem.appendChild(labelContainerElem);
            timeline.appendChild(unitElem);
        });
    }
}
window.Timeline = Timeline;