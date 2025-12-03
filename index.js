import { Chronoslider } from "./Chronoslider/chronoslider.js";

const timeline = new Chronoslider('#my-container', {
    resolution: 'year',
    startDate: new Date(2030, 0, 1, 0),
    unitWidth: 15,
    color: '#10564F',
});

timeline.onRangeSelected(({ startDate, endDate }) => {
    console.log(startDate, endDate);
});