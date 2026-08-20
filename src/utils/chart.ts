/**
 * Recharts' ResponsiveContainer renders once at `initialDimension` before its
 * ResizeObserver reports the real box. That default is { width: -1, height: -1 },
 * and the component warns to the console whenever it renders at a
 * non-positive size — which is every chart, on every mount ("The width(-1) and
 * height(-1) of chart should be greater than 0…").
 *
 * Seeding it with the height the container's CSS class actually reserves makes
 * that first render valid, so the warning stops and the chart doesn't reflow
 * from nothing on first paint. The width is a placeholder: it's replaced by the
 * measured value on the first observer tick, before anything is visible.
 *
 * Pass the same number of pixels the Tailwind height class gives the wrapper
 * (h-40 = 160, h-56 = 224, h-64 = 256, h-72 = 288).
 */
export const initialChartSize = (height: number) => ({ width: 600, height });
