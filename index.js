import { Chronoslider } from "./Chronoslider/chronoslider.js";

const timeline = new Chronoslider('.my-container', {
    resolution: 'year',
    minResolution: 'year',
    maxResolution: 'hour',
    startDate: new Date(2030, 0, 1, 0),
    unitWidth: 20,
    color: '#10564F',
});

timeline.onRangeSelected(({ startDate, endDate }) => {
    console.log(startDate, endDate);
});