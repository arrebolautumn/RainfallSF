import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { getAnnualRainfall } from '@/data/mockRainfallData';
import { TrendingUp, Droplets, Thermometer, CloudRain } from 'lucide-react';

const annualData = getAnnualRainfall();

export function DashboardOverview() {
  const [yearRange, setYearRange] = useState([1993, 2023]);
  const [compareVariable, setCompareVariable] = useState<'none' | 'temperature' | 'humidity'>('none');

  const filteredData = useMemo(() => {
    return annualData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
  }, [yearRange]);

  const stats = useMemo(() => {
    const total = filteredData.reduce((sum, d) => sum + d.totalRainfall, 0);
    const avg = total / filteredData.length;
    const max = Math.max(...filteredData.map(d => d.totalRainfall));
    const min = Math.min(...filteredData.map(d => d.totalRainfall));
    return { total: Math.round(total), avg: Math.round(avg), max: Math.round(max), min: Math.round(min) };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rainfall</CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()} mm</div>
            <p className="text-xs text-muted-foreground">{yearRange[0]} - {yearRange[1]}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Annual</CardTitle>
            <CloudRain className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.avg.toLocaleString()} mm</div>
            <p className="text-xs text-muted-foreground">Per year</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rainfall-success/10 to-rainfall-success/5 border-rainfall-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wettest Year</CardTitle>
            <TrendingUp className="h-4 w-4 text-rainfall-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.max.toLocaleString()} mm</div>
            <p className="text-xs text-muted-foreground">Maximum recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rainfall-warning/10 to-rainfall-warning/5 border-rainfall-warning/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Driest Year</CardTitle>
            <Thermometer className="h-4 w-4 text-rainfall-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.min.toLocaleString()} mm</div>
            <p className="text-xs text-muted-foreground">Minimum recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Rainfall Trends</CardTitle>
          <CardDescription>Explore rainfall patterns from 1993 to 2023</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Year Range: {yearRange[0]} - {yearRange[1]}</label>
              <Slider
                value={yearRange}
                onValueChange={setYearRange}
                min={1993}
                max={2023}
                step={1}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Compare With</label>
              <Select value={compareVariable} onValueChange={(v) => setCompareVariable(v as typeof compareVariable)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" className="text-xs" />
                <YAxis yAxisId="rainfall" className="text-xs" />
                {compareVariable !== 'none' && (
                  <YAxis yAxisId="secondary" orientation="right" className="text-xs" />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="rainfall"
                  type="monotone"
                  dataKey="totalRainfall"
                  name="Rainfall (mm)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
                {compareVariable === 'temperature' && (
                  <Line
                    yAxisId="secondary"
                    type="monotone"
                    dataKey="avgTemperature"
                    name="Temperature (°C)"
                    stroke="hsl(var(--rainfall-warning))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--rainfall-warning))', strokeWidth: 0, r: 3 }}
                  />
                )}
                {compareVariable === 'humidity' && (
                  <Line
                    yAxisId="secondary"
                    type="monotone"
                    dataKey="avgHumidity"
                    name="Humidity (%)"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
