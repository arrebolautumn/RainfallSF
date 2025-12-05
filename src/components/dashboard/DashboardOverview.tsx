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
  prcp: number; // rainfall per day
};

export function DashboardOverview() {
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DailyRecord | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load CSV
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
  >('none');

  const filteredDailyData = useMemo(
    () =>
      dailyData.filter((d) => {
        const y = d.date.getFullYear();
        return y >= yearRange[0] && y <= yearRange[1];
      }),
    [dailyData, yearRange]
  );

  const stats = useMemo(() => {
    if (!filteredDailyData.length) {
      return { total: 0, avg: 0, max: 0, min: 0 };
    }

    const values = filteredDailyData.map((d) => d.prcp);
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
  }, [filteredDailyData]);

  // Draw D3 chart with hover + click
  useEffect(() => {
    if (!svgRef.current || !filteredDailyData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 900;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(filteredDailyData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(filteredDailyData, (d) => d.prcp) || 0])
      .nice()
      .range([innerHeight, 0]);

    const line = d3
      .line<DailyRecord>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.prcp))
      .curve(d3.curveMonotoneX);

    const xAxis = d3
      .axisBottom<Date>(xScale)
      .tickFormat(d3.timeFormat('%Y') as any);
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append('g').call(yAxis);

    // Line only (no dots)
    g.append('path')
      .datum(filteredDailyData)
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('d', line);

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

        const i = bisectDate(filteredDailyData, x0, 1);
        const d0 = filteredDailyData[i - 1];
        const d1 = filteredDailyData[i];
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

        const label = `${d.date.toLocaleDateString()} • ${d.prcp.toFixed(
          1
        )} mm`;
        tooltipText.text(label);

        // fit background to text width
        const bbox = (tooltipText.node() as SVGTextElement).getBBox();
        tooltipBg.attr('width', bbox.width + 10);
      })
      .on('click', function (event) {
        const [x] = d3.pointer(event, this as any);
        const x0 = xScale.invert(x);

        const i = bisectDate(filteredDailyData, x0, 1);
        const d0 = filteredDailyData[i - 1];
        const d1 = filteredDailyData[i];
        const d =
          !d1 ||
          x0.getTime() - d0.date.getTime() <
            d1.date.getTime() - x0.getTime()
            ? d0
            : d1;

        setSelectedPoint(d); // store selection in React state
      });
  }, [filteredDailyData]);

  // === JSX ===
  return (
    <div className="space-y-6">
      {/* TODO: your four stats cards using `stats` + icons if you want */}

      <Card>
        <CardHeader>
          <CardTitle>Daily Rainfall Trends</CardTitle>
          <CardDescription>
            Explore day-by-day rainfall from {yearRange[0]} to {yearRange[1]}
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
              <span className="font-medium">Selected day:</span>{' '}
              {selectedPoint.date.toLocaleDateString()} –{' '}
              {selectedPoint.prcp.toFixed(1)} mm of rainfall
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
