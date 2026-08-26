import { ChronoSlider } from './ChronoSlider.js';

const slider = new ChronoSlider(
    document.getElementById('timeline'),
    new Date(),
    'day'
);

slider.setTimezone('utc');

slider.onRangeSelected((start, end) => console.log(start, end));