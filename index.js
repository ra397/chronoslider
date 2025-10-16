const timeline = new Timeline();
const controller = new TimelineController(timeline);

window.timeline = timeline; // TODO: remove, for testing purposes only

controller.onRangeSelected(({ startDate, endDate }) => {
    const startDateDisplay = document.createElement("div");
    startDateDisplay.textContent = "Start time: " + startDate.toLocaleString();

    const endDateDisplay = document.createElement("div");
    endDateDisplay.textContent = "End time: " + endDate.toLocaleString();

    document.body.append(startDateDisplay);
    document.body.append(endDateDisplay);
});