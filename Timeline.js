class Timeline {
    constructor() {
        this.state = {
            resolution: "year",
            centerDate: new Date(2021, 0, 1, 0),
            visibleUnits: 8
        }
    }

    getUnits(centerDate, resolution, count) {
        const units = [];
        const center = Math.floor(count / 2);

        for (let i = -center; i <= (count % 2 === 0 ? center - 1 : center); i++) {
            let date;
            let formattedDate;

            switch (resolution) {
                case 'year':
                    date = new Date(centerDate.getFullYear() + i, 0, 1);
                    formattedDate = date.getFullYear().toString();
                    break;

                case 'month':
                    date = new Date(centerDate.getFullYear(), centerDate.getMonth() + i, 1);
                    formattedDate = date.toLocaleString('default', {
                        month: 'short',
                        year: 'numeric',
                    });
                    break;

                case 'week':
                    const day = centerDate.getDay();
                    centerDate.setDate(centerDate.getDate() - day);
                    centerDate.setHours(0, 0, 0, 0);
                    date = new Date(centerDate);
                    date.setDate(centerDate.getDate() + i * 7);
                    formattedDate = date.toLocaleDateString('default', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                    })
                    break;

                case 'day':
                    date = new Date(centerDate);
                    date.setDate(centerDate.getDate() + i);
                    formattedDate = date.toLocaleDateString('default', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                    });
                    break;

                case 'hour':
                    date = new Date(centerDate);
                    date.setHours(centerDate.getHours() + i);
                    formattedDate = date.toLocaleString('default', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })
                    break;

                default:
                    throw new Error('Unsupported resolution: ' + resolution);
            }

            units.push(formattedDate);
        }
        return units;
    }

    pan(direction) {
        const { resolution, centerDate } = this.state;

        const newDate = new Date(centerDate);

        const change = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;

        switch (resolution) {
            case 'year':
                newDate.setFullYear(centerDate.getFullYear() + change);
                break;
            case 'month':
                newDate.setMonth(centerDate.getMonth() + change);
                break;
            case 'week':
                newDate.setDate(centerDate.getDate() + change * 7);
                break;
            case 'day':
                newDate.setDate(centerDate.getDate() + change);
                break;
            case 'hour':
                newDate.setHours(centerDate.getHours() + change);
                break;
            default:
                throw new Error('Unsupported resolution: ' + resolution);
        }

        this.state.centerDate = newDate;
        this.render();
    }

    zoom(direction) {
        const resolutions = ['year', 'month', 'week', 'day', 'hour'];
        const { resolution } = this.state;
        let { centerDate } = this.state;

        const currentIndex = resolutions.indexOf(resolution);
        let newIndex;

        if (direction === 'in') {
            if (currentIndex >= resolutions.length - 1) return; // Already at finest resolution
            newIndex = currentIndex + 1;
            if (this.state.centerDate) {
                centerDate = new Date(this.state.centerDate);
            }
        } else if (direction === 'out') {
            if (currentIndex <= 0) return; // Already at coarsest resolution
            newIndex = currentIndex - 1;
            // Keep the current centerDate
        } else {
            throw new Error('Unsupported zoom direction: ' + direction);
        }

        switch (resolutions[newIndex]) {
            case 'year':
                this.state.visibleUnits = 8;
                break;
            case 'month':
                this.state.visibleUnits = 12;
                break;
            case 'week':
                this.state.visibleUnits = 4;
                break;
            case 'day':
                this.state.visibleUnits = 7;
                break;
            case 'hour':
                this.state.visibleUnits = 12;
                break;
            default:
                this.state.visibleUnits = 8;
        }

        // Update state and re-render
        this.state.resolution = resolutions[newIndex];
        this.state.centerDate = centerDate;
        this.render();
    }

    render() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        const { centerDate, resolution, visibleUnits } = this.state;
        const units = this.getUnits(centerDate, resolution, visibleUnits);

        units.forEach(unitLabel => {
            const unitElem = document.createElement('span');
            unitElem.className = 'timeline-unit';
            unitElem.textContent = unitLabel;

            timeline.appendChild(unitElem);
        });
    }
}
window.Timeline = Timeline;