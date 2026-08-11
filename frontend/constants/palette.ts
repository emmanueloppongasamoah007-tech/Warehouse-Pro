/**
 * Color tokens for the values that cannot be expressed as NativeWind classes.
 *
 * Icons (@expo/vector-icons), ActivityIndicator, placeholderTextColor and
 * react-native-svg all take colors as props, and none of them are in
 * NativeWind's interop registry - a `dark:` class on them is a silent no-op.
 * Those call sites read from here through `usePalette()` instead.
 *
 * Anything that CAN be a class should stay a class. This is the exception list,
 * not a parallel styling system.
 *
 * Tokens are named by role rather than by hue so a call site says what it means
 * (`palette.muted`) instead of naming a shade that only makes sense in one
 * scheme (`slate400`).
 */

type PaletteTokens = {
  /** Brand accent. Same in both schemes - orange reads on white and on slate. */
  accent: string;
  /** Content sitting on top of an accent-filled surface. */
  onAccent: string;
  /** Primary text and high-emphasis icons. */
  strong: string;
  /** Secondary text, meta-row icons. */
  meta: string;
  /** Placeholder text, de-emphasised icons. */
  muted: string;
  /** Empty-state glyphs and other decorative marks. The quietest usable value. */
  faint: string;
  /** Destructive actions. */
  danger: string;
  /** Icons inside an error banner, which has its own tinted background. */
  onDangerSurface: string;
  /** Confirmation icons. */
  success: string;
  /** Page background. Matches bg-slate-50 / dark:bg-slate-950. */
  surface: string;
  /** Card background. Matches bg-white / dark:bg-slate-900. */
  card: string;
  /** Hairline borders. Matches border-slate-200 / dark:border-slate-800. */
  border: string;
  /** Text typed into an input. See useStableTextStyle in components/field-config. */
  inputText: string;

  /** Warehouse map: floor plate fill and its dashed outline. */
  mapFloor: string;
  mapFloorEdge: string;
  /** Warehouse map: aisle band fill and outline. */
  mapAisle: string;
  mapAisleEdge: string;
  /** Warehouse map: unvisited bin dots. */
  mapBin: string;
  /** Warehouse map: dashed leg between two stops. */
  mapLeg: string;
  /**
   * Warehouse map: the start marker, and the glyph drawn on top of it.
   *
   * These two invert together. In light the marker is near-black with white
   * text; in dark that same near-black disappears into the floor, so the marker
   * goes light and its label must go dark to stay readable.
   */
  mapStart: string;
  mapOnStart: string;
  /** Warehouse map: bin code captions under each stop. */
  mapLabel: string;

  /** Analytics chart: bar with orders, and an empty day's stub. */
  chartBar: string;
  chartBarEmpty: string;
  /** Analytics chart: value label above a bar, and the weekday caption. */
  chartValue: string;
  chartAxis: string;
  /**
   * Alpha suffix appended to a KPI tile's color for its icon halo.
   *
   * An 8% tint reads as a soft wash on a white card but vanishes on a dark one,
   * so dark needs roughly twice the opacity to land at the same visual weight.
   */
  tileHaloAlpha: string;
};

export const Palette: { light: PaletteTokens; dark: PaletteTokens } = {
  light: {
    accent: '#f97316', // orange-500
    onAccent: '#ffffff',
    strong: '#0f172a', // slate-900
    meta: '#64748b', // slate-500
    muted: '#94a3b8', // slate-400
    faint: '#cbd5e1', // slate-300
    danger: '#dc2626', // red-600
    onDangerSurface: '#b91c1c', // red-700
    success: '#047857', // emerald-700
    surface: '#f8fafc', // slate-50
    card: '#ffffff',
    border: '#e2e8f0', // slate-200
    inputText: '#0f172a', // slate-900

    mapFloor: '#ffffff',
    mapFloorEdge: '#cbd5e1', // slate-300
    mapAisle: '#f1f5f9', // slate-100
    mapAisleEdge: '#e2e8f0', // slate-200
    mapBin: '#cbd5e1', // slate-300
    mapLeg: '#fb923c', // orange-400
    mapStart: '#0f172a', // slate-900
    mapOnStart: '#ffffff',
    mapLabel: '#475569', // slate-600

    chartBar: '#f97316', // orange-500
    chartBarEmpty: '#e2e8f0', // slate-200
    chartValue: '#475569', // slate-600
    chartAxis: '#94a3b8', // slate-400
    tileHaloAlpha: '15', // ~8%
  },
  dark: {
    accent: '#f97316', // orange-500
    onAccent: '#ffffff',
    strong: '#f1f5f9', // slate-100
    meta: '#94a3b8', // slate-400
    muted: '#64748b', // slate-500
    faint: '#475569', // slate-600
    danger: '#f87171', // red-400 - red-600 is too dim on a dark surface
    onDangerSurface: '#fca5a5', // red-300
    success: '#34d399', // emerald-400
    surface: '#020617', // slate-950
    card: '#0f172a', // slate-900
    border: '#1e293b', // slate-800
    inputText: '#f1f5f9', // slate-100

    mapFloor: '#0f172a', // slate-900
    mapFloorEdge: '#475569', // slate-600
    mapAisle: '#1e293b', // slate-800
    mapAisleEdge: '#334155', // slate-700
    mapBin: '#475569', // slate-600
    mapLeg: '#fb923c', // orange-400
    mapStart: '#e2e8f0', // slate-200 - inverted so the marker stays visible
    mapOnStart: '#0f172a', // slate-900 - and its glyph inverts with it
    mapLabel: '#94a3b8', // slate-400

    chartBar: '#f97316', // orange-500
    chartBarEmpty: '#334155', // slate-700
    chartValue: '#cbd5e1', // slate-300
    chartAxis: '#64748b', // slate-500
    tileHaloAlpha: '2e', // ~18%
  },
};
