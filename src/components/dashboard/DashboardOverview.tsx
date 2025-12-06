import { useEffect, useState, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Droplets, Thermometer, CloudRain } from 'lucide-react';
import csvUrl from '@/data/san_francisco_weather_data.csv?url';

type DailyRecord = {
  date: Date;
  prcp: number; // rainfall (daily raw, monthly after aggregation)
};

export function DashboardOverview() {
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DailyRecord | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load CSV (raw daily data)
  useEffect(() => {
    d3.csv(csvUrl, (d) => {
      const dateStr = (d.date as string) ?? '';
      const prcp = +(d.prcp as string) || 0;

      return {
        date: dateStr ? new Date(dateStr) : new Date(),
        prcp,
      } as DailyRecord;
    }).then((rows) => {
      setDailyData(rows as DailyRecord[]);
    });
  }, []);

  // Year range
  const allYears =
    dailyData.length > 0
      ? d3.extent(dailyData, (d) => d.date.getFullYear())
      : [1993, 2023];

  const defaultMinYear = (allYears[0] as number) ?? 1993;
  const defaultMaxYear = (allYears[1] as number) ?? 2023;

  const [yearRange, setYearRange] = useState<[number, number]>([
    defaultMinYear,
    defaultMaxYear,
  ]);

  const [compareVariable, setCompareVariable] = useState<
    'none' | 'temperature' | 'humidity'
  >('none'); // reserved for future use

  // Filter daily data by year range
  const filteredDailyData = useMemo(
    () =>
      dailyData.filter((d) => {
        const y = d.date.getFullYear();
        return y >= yearRange[0] && y <= yearRange[1];
      }),
    [dailyData, yearRange]
  );

  // Aggregate to MONTHLY totals
  const monthlyData = useMemo(() => {
    if (!filteredDailyData.length) return [];

    // Group by calendar month and sum rainfall
    const grouped = d3.rollups(
      filteredDailyData,
      (values) => d3.sum(values, (d) => d.prcp),
      (d) => d3.timeMonth(d.date) // normalize to first day of the month
    );

    return grouped
      .map(([date, prcp]) => ({ date, prcp } as DailyRecord))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredDailyData]);

  // Stats based on MONTHLY totals
  const stats = useMemo(() => {
    if (!monthlyData.length) {
      return { total: 0, avg: 0, max: 0, min: 0 };
    }

    const values = monthlyData.map((d) => d.prcp);
    const total = values.reduce((s, v) => s + v, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      total: Math.round(total),
      avg: Math.round(avg),
      max: Math.round(max),
      min: Math.round(min),
    };
  }, [monthlyData]);

  // Draw D3 chart with hover + click, using MONTHLY data
  useEffect(() => {
    if (!svgRef.current || !monthlyData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 900;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 50, left: 70 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(monthlyData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(monthlyData, (d) => d.prcp) || 0])
      .nice()
      .range([innerHeight, 0]);

    const xAxis = d3
      .axisBottom<Date>(xScale)
      .tickFormat(d3.timeFormat('%Y') as any);
    const yAxis = d3.axisLeft(yScale);

    // GRID LINES (behind area)
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');

    // AREA SHAPE (CDC-style)
    const area = d3
      .area<DailyRecord>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.prcp))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(monthlyData)
      .attr('fill', 'rgba(84, 149, 253, 0.25)')
      .attr('stroke', 'rgba(19, 106, 245, 1)')
      .attr('stroke-width', 1.5)
      .attr('d', area);

    // AXES
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append('g').call(yAxis);

    // axis styling
    g.selectAll('.domain').attr('stroke', '#777');
    g.selectAll('.tick line').attr('stroke', '#cccccc');
    g.selectAll('.tick text').attr('fill', '#444').attr('font-size', 12);

    // X LABEL
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#444')
      .attr('font-size', 13)
      .text('Year');

    // Y LABEL
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#444')
      .attr('font-size', 13)
      .text('Monthly Rainfall (mm)');

    // ===== HOVER / CLICK INTERACTION =====
    const bisectDate = d3.bisector<DailyRecord, Date>((d) => d.date).left;

    const focus = g.append('g').style('display', 'none');

    // vertical line
    focus
      .append('line')
      .attr('class', 'focus-line')
      .attr('y1', innerHeight)
      .attr('y2', 0)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .attr('stroke-dasharray', '3,3');

    // circle at the data point
    focus
      .append('circle')
      .attr('r', 4)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    // tooltip background
    const tooltipBg = focus
      .append('rect')
      .attr('x', 8)
      .attr('y', -30)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('height', 22)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5);

    // tooltip text
    const tooltipText = focus
      .append('text')
      .attr('x', 14)
      .attr('y', -14)
      .attr('font-size', 11);

    // transparent overlay to capture mouse events
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        focus.style('display', null);
      })
      .on('mouseout', () => {
        focus.style('display', 'none');
      })
      .on('mousemove', function (event) {
        const [x] = d3.pointer(event, this as any);
        const x0 = xScale.invert(x);

        const i = bisectDate(monthlyData, x0, 1);
        const d0 = monthlyData[i - 1];
        const d1 = monthlyData[i];
        const d =
          !d1 ||
          x0.getTime() - d0.date.getTime() <
            d1.date.getTime() - x0.getTime()
            ? d0
            : d1;

        const xPos = xScale(d.date);
        const yPos = yScale(d.prcp);

        focus.attr('transform', `translate(${xPos},${yPos})`);
        focus.select('.focus-line').attr('x1', 0).attr('x2', 0);

        const label = `${d.date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
        })} • ${d.prcp.toFixed(1)} mm`;
        tooltipText.text(label);

        // fit background to text width
        const bbox = (tooltipText.node() as SVGTextElement).getBBox();
        tooltipBg.attr('width', bbox.width + 10);
      })
      .on('click', function (event) {
        const [x] = d3.pointer(event, this as any);
        const x0 = xScale.invert(x);

        const i = bisectDate(monthlyData, x0, 1);
        const d0 = monthlyData[i - 1];
        const d1 = monthlyData[i];
        const d =
          !d1 ||
          x0.getTime() - d0.date.getTime() <
            d1.date.getTime() - x0.getTime()
            ? d0
            : d1;

        setSelectedPoint(d); // store selected MONTH
      });
  }, [monthlyData]);

  // === JSX ===
  return (
    <div className="space-y-6">
      {/* Stats Cards using `stats` (monthly) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rainfall
            </CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.total.toLocaleString()} mm
            </div>
            <p className="text-xs text-muted-foreground">
              {yearRange[0]} - {yearRange[1]} (monthly totals)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Monthly
            </CardTitle>
            <CloudRain className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.avg.toLocaleString()} mm
            </div>
            <p className="text-xs text-muted-foreground">Per month in range</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rainfall-success/10 to-rainfall-success/5 border-rainfall-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wettest Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-rainfall-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.max.toLocaleString()} mm
            </div>
            <p className="text-xs text-muted-foreground">
              Max monthly rainfall in range
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rainfall-warning/10 to-rainfall-warning/5 border-rainfall-warning/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Driest Month
            </CardTitle>
            <Thermometer className="h-4 w-4 text-rainfall-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.min.toLocaleString()} mm
            </div>
            <p className="text-xs text-muted-foreground">
              Min monthly rainfall in range
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main chart card */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Rainfall Trends</CardTitle>
          <CardDescription>
            Explore month-by-month rainfall from {yearRange[0]} to {yearRange[1]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Year Range: {yearRange[0]} - {yearRange[1]}
              </label>
              <Slider
                value={yearRange}
                onValueChange={setYearRange}
                min={defaultMinYear}
                max={defaultMaxYear}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="h-[400px] w-full">
            <svg ref={svgRef} className="w-full h-full" />
          </div>

          {/* Info shown after click */}
          {selectedPoint && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Selected month:</span>{' '}
              {selectedPoint.date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
              })}{' '}
              – {selectedPoint.prcp.toFixed(1)} mm of rainfall
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
