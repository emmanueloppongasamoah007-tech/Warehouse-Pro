import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-palette';
import { type Order } from '@/store/use-active-order-store';

type OrderAnalyticsProps = {
  orders: Order[];
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BAR_WIDTH = 28;
const BAR_GAP = 10;
// Vertical budget, top to bottom: room for a value label above the tallest bar,
// the bars themselves, then the day labels. The SVG height is the sum of all
// three - anything drawn outside it is clipped, because overflow does not
// reliably escape an Svg on Android, which is what hid the day labels.
const LABEL_TOP = 16;
const BAR_AREA = 80;
const LABEL_BOTTOM = 20;
const CHART_HEIGHT = LABEL_TOP + BAR_AREA + LABEL_BOTTOM;
/** Baseline the bars stand on, measured from the top of the SVG. */
const BASELINE = LABEL_TOP + BAR_AREA;

/**
 * Order analytics summary at the top of History.
 *
 * Stat tiles show the numbers; the bar chart shows the distribution. Kept in a
 * single component because they are part of the same visual section and are
 * always both visible.
 */
export function OrderAnalytics({ orders }: OrderAnalyticsProps) {
  const palette = usePalette();

  const stats = useMemo(() => {
    const now = new Date();
    const completed = orders.filter((o) => o.status === 'COMPLETED');
    const pending = orders.filter((o) => o.status !== 'COMPLETED');
    const total = orders.length;

    // Rate: orders completed per hour, bounded to today. At the start of the
    // day (or before any orders exist) this reads as 0 rather than Infinity.
    let ratePerHour = 0;
    const completedToday = completed.filter((o) => isSameDay(new Date(o.createdAt), now));
    if (completedToday.length > 0) {
      const startOfToday = new Date(now);
      startOfToday.setHours(8, 0, 0, 0); // 8am start, warehouse opens
      const elapsedHours = Math.max(1, (now.getTime() - startOfToday.getTime()) / 3_600_000);
      ratePerHour = completedToday.length / elapsedHours;
    }

    // Average duration for completed orders that have a completedAt.
    const durations = completed
      .filter((o) => o.completedAt)
      .map((o) => new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime())
      .filter((ms) => ms > 0 && Number.isFinite(ms));
    const avgMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length / 60_000)
        : 0;

    return { total, completed: completed.length, pending: pending.length, ratePerHour, avgMinutes };
  }, [orders]);

  // Bar chart: orders created per day of week, last 7 days.
  const bars = useMemo(() => {
    const now = new Date();
    const counts: number[] = Array(7).fill(0);

    for (const order of orders) {
      const date = new Date(order.createdAt);
      // Only include orders from the last 7 days.
      if (now.getTime() - date.getTime() > 7 * 24 * 60 * 60 * 1000) continue;
      const dayIndex = (date.getDay() + 6) % 7; // 0 = Mon
      counts[dayIndex] += 1;
    }

    const max = Math.max(1, ...counts);
    return DAY_LABELS.map((label, i) => ({
      label,
      count: counts[i],
      // Scaled to the bar area, so the tallest day fills it and the rest are
      // proportional to that.
      height: (counts[i] / max) * BAR_AREA,
    }));
  }, [orders]);


  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Overview
      </Text>

      {/* KPI row: 3 stat tiles */}
      <View className="mt-4 flex-row gap-3">
        <KpiTile
          icon="speedometer"
          label="Rate / hr"
          value={stats.ratePerHour.toFixed(1)}
          color="#f97316"
        />
        <KpiTile
          icon="clock-check-outline"
          label="Avg. time"
          value={stats.avgMinutes > 0 ? `${stats.avgMinutes}m` : '—'}
          color="#10b981"
        />
        <KpiTile
          icon="clipboard-check"
          label="Completed"
          value={`${stats.completed}/${stats.total}`}
          color="#3b82f6"
        />
      </View>

      {/* Pending progress bar */}
      {stats.pending > 0 ? (
        <View className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {stats.pending} pending {stats.pending === 1 ? 'order' : 'orders'}
            </Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              {stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}% complete`
                : ''}
            </Text>
          </View>
          <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <View
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
              }}
            />
          </View>
        </View>
      ) : null}

      {/* Orders per day bar chart */}
      <View className="mt-5">
        <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">This week</Text>
        <View className="mt-3 items-center">
          <Svg
            width={bars.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP}
            height={CHART_HEIGHT}>
            {bars.map((bar, i) => (
              // G, not View: children of Svg must be SVG elements. A View here
              // renders nothing and silently blanks the chart.
              <G key={bar.label}>
                {/* Bar grows upward from the baseline. Orange where there are
                    orders, slate where there are none, so an empty day still
                    reads as a day rather than disappearing. */}
                <Rect
                  x={i * (BAR_WIDTH + BAR_GAP)}
                  y={BASELINE - bar.height}
                  width={BAR_WIDTH}
                  height={Math.max(2, bar.height)}
                  rx={4}
                  fill={bar.count > 0 ? palette.chartBar : palette.chartBarEmpty}
                />
                {/* Labelled selectively: only days with orders carry a value,
                    so the numbers stay scannable instead of becoming noise. */}
                {bar.count > 0 ? (
                  <SvgText
                    x={i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2}
                    y={BASELINE - bar.height - 5}
                    fontSize={11}
                    fontWeight="600"
                    fill={palette.chartValue}
                    textAnchor="middle">
                    {String(bar.count)}
                  </SvgText>
                ) : null}
                <SvgText
                  x={i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2}
                  y={BASELINE + 15}
                  fontSize={10}
                  fill={palette.chartAxis}
                  textAnchor="middle">
                  {bar.label}
                </SvgText>
              </G>
            ))}
          </Svg>
        </View>
      </View>
    </View>
  );
}

function KpiTile({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const palette = usePalette();

  return (
    <View className="flex-1 items-center rounded-xl bg-slate-50 py-3 dark:bg-slate-800">
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        // Alpha appended to the tile's own color. The suffix is per-scheme: the
        // ~8% wash that reads on a white card is invisible on a dark one, so
        // dark carries roughly twice the opacity to land at the same weight.
        style={{ backgroundColor: `${color}${palette.tileHaloAlpha}` }}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</Text>
      <Text className="text-[10px] text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
