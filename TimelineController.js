const timeline = new Timeline();
timeline.render();

const timelineElement = document.getElementById('timeline');

// initialize zoom in/out event listener
timelineElement.addEventListener('wheel', (event) => {
    event.preventDefault();

    if (event.deltaY < 0) {
        timeline.zoom('in');
    } else {
        timeline.zoom('out');
    }
});

// initialize pan right/left event listener
const panLeftBtn = document.getElementById('pan-left-btn');
const panRightBtn = document.getElementById('pan-right-btn');
panLeftBtn.addEventListener('click', () => {
    timeline.pan('left');
})
panRightBtn.addEventListener('click', () => {
    timeline.pan('right');
})