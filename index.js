import { Timeline } from "./Timeline/Timeline.js";
import { TimelineController } from "./Timeline/TimelineController.js";

const timeline = new Timeline({
    unitWidth: 35,
});
const controller = new TimelineController(timeline);

controller.onRangeSelected(({ startDate, endDate }) => {
    console.log(startDate, endDate);
});