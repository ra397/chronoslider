# ChronoSlider
A simple timeline component for selecting date ranges.

## Demo
[Try on CodePen](https://codepen.io/ra397/full/myPzrzM)

## Features
- Select date ranges
- Zoom between resolutions (year → month → day → hour)
- Pan the timeline
- Responsive to container size
- Customizable size and color
- CSS-based styling (easy to modify)
- Easy setup and cleanup

## Setup
1. Add the `Chronoslider/chronoslider.js` and `Chronoslider/chronoslider.css` to your project.
2. Link the CSS file:
```html
<link href="path/to/chronoslider.css" rel="stylesheet">
```

3. Create a container and initialize:
```html
<div class="my-container"></div>

<script type="module">
  import { Chronoslider } from './chronoslider.js';

  const timeline = new Chronoslider('.my-container', {
    unitWidth: 15,
    startDate: new Date(2025, 0, 1),
    resolution: 'year'
  });
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startDate` | `Date` | `new Date(2025, 0, 1)` | Initial visible date |
| `resolution` | `string` | `'year'` | Initial zoom level: `'year'`, `'month'`, `'day'`, `'hour'` |
| `minResolution` | `string` | `'year'` | Minimum zoom level |
| `maxResolution` | `string` | `'hour'` | Maximum zoom level |
| `unitWidth` | `number` | `15` | Width of each time unit in pixels |
| `color` | `string` | `'#000'` | Timeline color |

## Usage

### Get selected range
```javascript
timeline.onRangeSelected(({ startDate, endDate }) => {
  console.log(startDate, endDate);
});
```

### Cleanup
```javascript
timeline.destroy();
```

## Controls
| Action | Result |
|--------|--------|
| Click | Select start date, click again to select end date |
| Double-click | Zoom in at clicked position |
| Scroll up | Zoom in |
| Scroll down | Zoom out |
| Drag | Pan the timeline |

## Customization
Modify `timeline.css` to change the appearance. The component uses CSS variables:
- `--unit-width`: Controls spacing
- `--timeline-color`: Controls color
