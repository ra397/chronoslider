# ChronoSlider
A lightweight, configurable timeline component for selecting date ranges. Supports multiple zoom levels, drag-to-pan, and is responsive to container size.

## Demo
[Try on CodePen](https://codepen.io/ra397/full/myPzrzM)

## Features
- **Date range selection**: select start/end date
- **Multi-level zoom**: Year → Month → Day → Hour
- **Intuitive controls**: Scroll to zoom, drag to pan, double-click/scroll to zoom in/out
- **Responsive**: Automatically adjusts to container width
- **Easy to use**: Simple initialization, easy cleanup
- **Customizable**: Available CSS that can be used to custom style

## Installation
1. Copy `chronoslider.js` and `Chronoslider.css` to your project
2. Import and initialize
    ```html
    <link href="Chronoslider/timeline.css" rel="stylesheet">
    <div id="my-timeline"></div>
    
    <script type="module">
      import { Chronoslider } from './Chronoslider.js';
      
      const timeline = new Chronoslider('#my-timeline', {
        unitWidth: 15, // in pixels
        startDate: new Date(2025, 0, 1),
        resolution: 'year'
      });
    </script>
    ```
3. Parameters

    | Option | Type | Default | Description |
    |--------|------|---------|-------------|
    | `unitWidth` | `number` | `15` | Width of each time unit in pixels |
    | `startDate` | `Date` | `new Date()` | Initial view start date |
    | `resolution` | `string` | `'year'` | Initial zoom level: `'year'`, `'month'`, `'day'`, or `'hour'` |

4. Listen to selection
    ```javascript
    timeline.onRangeSelected(({ startDate, endDate }) => {
      console.log(startDate, endDate);
    });
    ```
5. Cleanup (optional)
    ```javascript
    timeline.destroy();
    ```
## Controls
| Action | Effect |
|--------|--------|
| **Click** | Select start date, click again for end date |
| **Double-click** | Zoom in, centered on clicked date |
| **Scroll up** | Zoom in |
| **Scroll down** | Zoom out |
| **Drag left/right** | Pan the timeline |

## License