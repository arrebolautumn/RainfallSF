import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type WeatherRow = {
  date: Date;
  tavg: number;
  pres: number;
};

type MonthlyStats = {
  monthIndex: number;   // 0–11
  monthLabel: string;   // Jan, Feb, ...
  // tavg stats (for summaries & line chart)
  tavgMean: number;
  tavgMin: number;
  tavgMax: number;
  tavgCount: number;
  // pres stats (for pressure chart)
  presMean: number;
  presMin: number;
  presMax: number;
  presCount: number;
};

const SVG_WIDTH = 900;
const SVG_HEIGHT = 360;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 };

export function SeasonalAnalysis() {
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const presSvgRef = useRef<SVGSVGElement | null>(null);
  const tempSvgRef = useRef<SVGSVGElement | null>(null);

  // 1. Load CSV + compute monthly stats (tavg + pres)
  useEffect(() => {
    const csvUrl = new URL(
      '../../data/san_francisco_weather_data.csv',
      import.meta.url
    );

    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatMonth = d3.timeFormat('%b');

    d3.csv(csvUrl.href, (row): WeatherRow | null => {
      const dateStr = row.date as string | undefined;
      const tavgStr = row.tavg as string | undefined;
      const presStr = row.pres as string | undefined;

      if (!dateStr || !tavgStr || !presStr) return null;

      const date = parseDate(dateStr);
      const tavg = +tavgStr;
      const pres = +presStr;

      if (!date || isNaN(tavg) || isNaN(pres)) return null;

      return { date, tavg, pres };
    })
      .then((rows) => {
        const clean = rows.filter((d): d is WeatherRow => d !== null);

        if (!clean.length) {
          console.warn('No valid rows from CSV for tavg/pres month calculation.');
          setMonthlyData([]);
          setLoading(false);
          return;
        }

        // Group by month index (0–11) and roll up stats for tavg and pres.
        const rollup = d3.rollup<
          WeatherRow,
          {
            tavgMean: number;
            tavgMin: number;
            tavgMax: number;
            tavgCount: number;
            presMean: number;
            presMin: number;
            presMax: number;
            presCount: number;
          }
        >(
          clean,
          (values) => {
            const tavgVals = values
              .map((v) => v.tavg)
              .filter((v) => 
                v !== -17.8 &&        // sentinel
                v !== 0 &&            // drop bogus zeros (common)
                v > -10 &&            // SF never goes below -10°C
                v < 45   
              );
            
            const presVals = values.map((v) => v.pres);
            
            return {
              tavgMean: d3.mean(tavgVals) ?? NaN,
              tavgMin: d3.min(tavgVals) ?? NaN,
              tavgMax: d3.max(tavgVals) ?? NaN,
              tavgCount: tavgVals.length,
              presMean: d3.mean(presVals) ?? NaN,
              presMin: d3.min(presVals) ?? NaN,
              presMax: d3.max(presVals) ?? NaN,
              presCount: presVals.length,
            };
          },
          (d) => d.date.getMonth()
        );

        const monthlyArray: MonthlyStats[] = Array.from(
          rollup,
          ([monthIndex, s]) => ({
            monthIndex,
            monthLabel: formatMonth(new Date(2000, monthIndex, 1)),
            tavgMean: Number((s.tavgMean ?? NaN).toFixed(1)),
            tavgMin: Number((s.tavgMin ?? NaN).toFixed(1)),
            tavgMax: Number((s.tavgMax ?? NaN).toFixed(1)),
            tavgCount: s.tavgCount,
            presMean: Number((s.presMean ?? NaN).toFixed(1)),
            presMin: Number((s.presMin ?? NaN).toFixed(1)),
            presMax: Number((s.presMax ?? NaN).toFixed(1)),
            presCount: s.presCount,
          })
        ).sort((a, b) => a.monthIndex - b.monthIndex);

        setMonthlyData(monthlyArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading CSV', err);
        setLoading(false);
      });
  }, []);

  // 2. Overall warmest/coolest months by tavg
  const overallSummary = useMemo(() => {
    if (!monthlyData.length) return null;

    const warmest = monthlyData.reduce((acc, d) =>
      d.tavgMean > acc.tavgMean ? d : acc
    );
    const coolest = monthlyData.reduce((acc, d) =>
      d.tavgMean < acc.tavgMean ? d : acc
    );

    return { warmest, coolest };
  }, [monthlyData]);

  // 3. Pressure bar chart (pres) with custom hover tooltip
  useEffect(() => {
    if (!monthlyData.length || !presSvgRef.current) return;

    const svg = d3.select(presSvgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

    const x = d3
      .scaleBand<string>()
      .domain(monthlyData.map((d) => d.monthLabel))
      .range([MARGIN.left, MARGIN.left + innerWidth])
      .padding(0.2);

    const presValues = monthlyData.map((d) => d.presMean);
    const presMin = d3.min(presValues) ?? 0;
    const presMax = d3.max(presValues) ?? 0;
    const domainPadding = 5;

    const y = d3
      .scaleLinear()
      .domain([presMin - domainPadding, presMax + domainPadding])
      .nice()
      .range([MARGIN.top + innerHeight, MARGIN.top]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y).ticks(8);

    svg
      .append('g')
      .attr('transform', `translate(0,${MARGIN.top + innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px');

    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px');

    svg
      .append('text')
      .attr('x', -(MARGIN.top + innerHeight / 2))
      .attr('y', 16)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'currentColor')
      .text('Average pressure (hPa)');

    const baseY = y(presMin - domainPadding);

    // Bars
    const barGroup = svg.append('g');

    const bars = barGroup
      .selectAll('rect')
      .data(monthlyData)
      .join('rect')
      .attr('x', (d) => x(d.monthLabel)!)
      .attr('y', (d) => y(d.presMean))
      .attr('width', x.bandwidth())
      .attr('height', (d) => baseY - y(d.presMean))
      .attr('rx', 4)
      .attr('fill', 'hsl(199, 89%, 52%)');

    // Hover group (vertical line + tooltip)
    const hoverGroup = svg.append('g').style('display', 'none');

    const hoverLine = hoverGroup
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', MARGIN.top + innerHeight)
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1);

    const tooltip = hoverGroup.append('g');
    const tooltipBg = tooltip
      .append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(15, 23, 42, 0.9)');

    const tooltipTextMonth = tooltip
      .append('text')
      .attr('fill', 'white')
      .attr('font-size', 14)
      .attr('font-weight', '800');

    const tooltipTextLines = [
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
    ];

    const showHover = (d: MonthlyStats) => {
      const barX = x(d.monthLabel)!;
      const cx = barX + x.bandwidth() / 2;

      hoverGroup.style('display', null);
      hoverLine.attr('x1', cx).attr('x2', cx);

      const tooltipX = cx + 20;
      const tooltipY = MARGIN.top + 30;

      tooltipTextMonth
        .attr('x', tooltipX)
        .attr('y', tooltipY)
        .text(d.monthLabel);

      tooltipTextLines[0]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 14)
        .text(`Mean: ${d.presMean} hPa`);
      tooltipTextLines[1]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 26)
        .text(`Max: ${d.presMax} hPa`);
      tooltipTextLines[2]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 38)
        .text(`Min: ${d.presMin} hPa`);

      // Auto-size tooltip background with symmetric padding
      const textNodes = [tooltipTextMonth, ...tooltipTextLines];
      const bboxes = textNodes.map(
        (t) => (t.node() as SVGTextElement).getBBox()
      );

      const minX = Math.min(...bboxes.map((b) => b.x));
      const maxX = Math.max(...bboxes.map((b) => b.x + b.width));
      const minY = Math.min(...bboxes.map((b) => b.y));
      const maxY = Math.max(...bboxes.map((b) => b.y + b.height));

      const paddingX = 10;
      const paddingY = 8;

      tooltipBg
        .attr('x', minX - paddingX)
        .attr('y', minY - paddingY)
        .attr('width', maxX - minX + paddingX * 2)
        .attr('height', maxY - minY + paddingY * 2);
    };

    const hideHover = () => {
      hoverGroup.style('display', 'none');
    };

    // Attach hover handlers to bars
    bars
      .on('mouseenter', (_, d) => showHover(d))
      .on('mousemove', (_, d) => showHover(d))
      .on('mouseleave', hideHover);
  }, [monthlyData]);

  // 4. Temperature trends line chart (min / mean / max) with hover
  useEffect(() => {
    if (!monthlyData.length || !tempSvgRef.current) return;

    const svg = d3.select(tempSvgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

    const xBand = d3
      .scaleBand<string>()
      .domain(monthlyData.map((d) => d.monthLabel))
      .range([MARGIN.left, MARGIN.left + innerWidth])
      .paddingInner(0.1);

    const xCenter = (label: string) =>
      (xBand(label) ?? 0) + xBand.bandwidth() / 2;

    const allMins = monthlyData.map((d) => d.tavgMin);
    const allMaxs = monthlyData.map((d) => d.tavgMax);
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);

    const y = d3
      .scaleLinear()
      .domain([globalMin - 2, globalMax + 2])
      .nice()
      .range([MARGIN.top + innerHeight, MARGIN.top]);

    const xAxis = d3.axisBottom(xBand);
    const yAxis = d3.axisLeft(y).ticks(8);

    svg
      .append('g')
      .attr('transform', `translate(0,${MARGIN.top + innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px');

    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px');

    svg
      .append('text')
      .attr('x', -(MARGIN.top + innerHeight / 2))
      .attr('y', 16)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'currentColor')
      .text('Temperature (°C)');

    const lineMean = d3
      .line<MonthlyStats>()
      .x((d) => xCenter(d.monthLabel))
      .y((d) => y(d.tavgMean))
      .curve(d3.curveMonotoneX);

    const lineMax = d3
      .line<MonthlyStats>()
      .x((d) => xCenter(d.monthLabel))
      .y((d) => y(d.tavgMax))
      .curve(d3.curveMonotoneX);

    const lineMin = d3
      .line<MonthlyStats>()
      .x((d) => xCenter(d.monthLabel))
      .y((d) => y(d.tavgMin))
      .curve(d3.curveMonotoneX);

    const colorMean = 'hsl(199, 89%, 52%)'; // blue
    const colorMax = 'hsl(0, 75%, 60%)';     // red
    const colorMin = 'hsl(172, 66%, 45%)';   // teal

    svg
      .append('path')
      .datum(monthlyData)
      .attr('fill', 'none')
      .attr('stroke', colorMax)
      .attr('stroke-width', 2)
      .attr('d', lineMax);

    svg
      .append('path')
      .datum(monthlyData)
      .attr('fill', 'none')
      .attr('stroke', colorMin)
      .attr('stroke-width', 2)
      .attr('d', lineMin);

    svg
      .append('path')
      .datum(monthlyData)
      .attr('fill', 'none')
      .attr('stroke', colorMean)
      .attr('stroke-width', 2.5)
      .attr('d', lineMean);

    // Legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const legendItems = [
      { label: 'Max', color: colorMax },
      { label: 'Mean', color: colorMean },
      { label: 'Min', color: colorMin },
    ];

    legendItems.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 80},0)`);
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 20)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 3);
      g.append('text')
        .attr('x', 26)
        .attr('y', 4)
        .style('font-size', '11px')
        .text(item.label);
    });

    // Hover elements
    const hoverGroup = svg.append('g').style('display', 'none');

    const hoverLine = hoverGroup
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', MARGIN.top + innerHeight)
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1);

    const hoverCircleMean = hoverGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', colorMean);

    const hoverCircleMax = hoverGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', colorMax);

    const hoverCircleMin = hoverGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', colorMin);

    const tooltip = hoverGroup.append('g');
    const tooltipBg = tooltip
      .append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(15, 23, 42, 0.9)');

    const tooltipTextMonth = tooltip
      .append('text')
      .attr('fill', 'white')
      .attr('font-size', 14)
      .attr('font-weight', '800');

    const tooltipTextLines = [
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
      tooltip.append('text').attr('fill', 'white').attr('font-size', 10),
    ];

    const showHover = (d: MonthlyStats) => {
      const cx = xCenter(d.monthLabel);

      hoverGroup.style('display', null);
      hoverLine.attr('x1', cx).attr('x2', cx);

      hoverCircleMean.attr('cx', cx).attr('cy', y(d.tavgMean));
      hoverCircleMax.attr('cx', cx).attr('cy', y(d.tavgMax));
      hoverCircleMin.attr('cx', cx).attr('cy', y(d.tavgMin));

      const tooltipX = cx + 20;
      const tooltipY = y(d.tavgMax) - 10;

      tooltipTextMonth
        .attr('x', tooltipX)
        .attr('y', tooltipY)
        .text(d.monthLabel);

      tooltipTextLines[0]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 14)
        .text(`Max: ${d.tavgMax} °C`);
      tooltipTextLines[1]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 26)
        .text(`Mean: ${d.tavgMean} °C`);
      tooltipTextLines[2]
        .attr('x', tooltipX)
        .attr('y', tooltipY + 38)
        .text(`Min: ${d.tavgMin} °C`);

      const textNodes = [tooltipTextMonth, ...tooltipTextLines];
      const bboxes = textNodes.map(
        (t) => (t.node() as SVGTextElement).getBBox()
      );

      const minX = Math.min(...bboxes.map((b) => b.x));
      const maxX = Math.max(...bboxes.map((b) => b.x + b.width));
      const minY = Math.min(...bboxes.map((b) => b.y));
      const maxY = Math.max(...bboxes.map((b) => b.y + b.height));

      const paddingX = 10;
      const paddingY = 8;
      tooltipBg
        .attr('x', minX - paddingX)
        .attr('y', minY - paddingY)
        .attr('width', maxX - minX + paddingX * 2)
        .attr('height', maxY - minY + paddingY * 2);
    };

    const hideHover = () => {
      hoverGroup.style('display', 'none');
    };

    svg
      .append('g')
      .selectAll('rect')
      .data(monthlyData)
      .join('rect')
      .attr('x', (d) => xBand(d.monthLabel) ?? 0)
      .attr('y', MARGIN.top)
      .attr('width', xBand.bandwidth())
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mouseenter', (_, d) => showHover(d))
      .on('mousemove', (_, d) => showHover(d))
      .on('mouseleave', hideHover);
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Average Monthly Pressure (pres) */}
      <Card>
        <CardHeader>
          <CardTitle>Average Monthly Pressure</CardTitle>
          <CardDescription>
            Mean daily average sea-level pressure per month, aggregated over all years in the dataset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[360px]">
            <svg
              ref={presSvgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Temperature Trends (3-line chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Temperature Trends</CardTitle>
          <CardDescription>
            Minimum, mean, and maximum daily average temperature per month,
            aggregated over all years in the dataset. Hover over a month to see details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[360px]">
            <svg
              ref={tempSvgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full"
            />
          </div>
        </CardContent>
      </Card>

      
      {/* Warmest / Coolest month by TAVG */}
      {overallSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Warmest Month</CardTitle>
              <CardDescription>Highest average temperature across years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallSummary.warmest.monthLabel}
              </div>
              <p className="text-sm text-muted-foreground">
                Mean: {overallSummary.warmest.tavgMean} °C
              </p>
              <p className="text-xs text-muted-foreground">
                Range: {overallSummary.warmest.tavgMin}–{overallSummary.warmest.tavgMax} °C
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Coolest Month</CardTitle>
              <CardDescription>Lowest average temperature across years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallSummary.coolest.monthLabel}
              </div>
              <p className="text-sm text-muted-foreground">
                Mean: {overallSummary.coolest.tavgMean} °C
              </p>
              <p className="text-xs text-muted-foreground">
                Range: {overallSummary.coolest.tavgMin}–{overallSummary.coolest.tavgMax} °C
              </p>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
