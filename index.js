import { Chronoslider } from "./Chronoslider/chronoslider.js";

const timeline = new Chronoslider('#my-container', {
    unitWidth: 15,
    color: '#8a8686',
});

timeline.onRangeSelected(({ startDate, endDate }) => {
    console.log(startDate, endDate);
});