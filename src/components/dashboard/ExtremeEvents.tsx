import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getExtremeEvents, getAnnualRainfall } from '@/data/mockRainfallData';

const extremeEvents = getExtremeEvents();
const annualData = getAnnualRainfall();

const categoryColors: Record<string, string> = {
  extreme_high: 'hsl(var(--rainfall-danger))',
  high: 'hsl(var(--rainfall-warning))',
  normal: 'hsl(var(--primary))',
  low: 'hsl(var(--accent))',
  extreme_low: 'hsl(262, 83%, 58%)',
};

const categoryLabels: Record<string, string> = {
  extreme_high: 'Extreme High',
  high: 'Above Average',
  normal: 'Normal',
  low: 'Below Average',
  extreme_low: 'Extreme Low',
};

export function ExtremeEvents() {
  const stats = useMemo(() => {
    const avgRainfall = annualData.reduce((sum, d) => sum + d.totalRainfall, 0) / annualData.length;
    const extremeHighCount = extremeEvents.filter(e => e.category === 'extreme_high').length;
    const extremeLowCount = extremeEvents.filter(e => e.category === 'extreme_low').length;
    const maxEvent = extremeEvents.reduce((max, e) => e.rainfall > max.rainfall ? e : max);
    const minEvent = extremeEvents.reduce((min, e) => e.rainfall < min.rainfall ? e : min);
    
    return { avgRainfall: Math.round(avgRainfall), extremeHighCount, extremeLowCount, maxEvent, minEvent };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      extreme_high: 0,
      high: 0,
      normal: 0,
      low: 0,
      extreme_low: 0,
    };
    extremeEvents.forEach(e => counts[e.category]++);
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-rainfall-danger/10 to-rainfall-danger/5 border-rainfall-danger/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extreme Wet Years</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rainfall-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.extremeHighCount}</div>
            <p className="text-xs text-muted-foreground">Years with extreme high rainfall</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extreme Dry Years</CardTitle>
            <TrendingDown className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.extremeLowCount}</div>
            <p className="text-xs text-muted-foreground">Years with extreme low rainfall</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rainfall-success/10 to-rainfall-success/5 border-rainfall-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wettest Year</CardTitle>
            <TrendingUp className="h-4 w-4 text-rainfall-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maxEvent.year}</div>
            <p className="text-xs text-muted-foreground">{Math.round(stats.maxEvent.rainfall)} mm recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rainfall</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRainfall} mm</div>
            <p className="text-xs text-muted-foreground">Historical average</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Event Distribution</CardTitle>
          <CardDescription>Classification of years by rainfall intensity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div key={category} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: categoryColors[category] }}
                />
                <span className="text-sm text-muted-foreground">{categoryLabels[category]}:</span>
                <Badge variant="secondary">{count} years</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deviation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Rainfall Deviation Timeline</CardTitle>
          <CardDescription>Standard deviation from historical mean (dashed line = average)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={extremeEvents} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" className="text-xs" />
                <YAxis className="text-xs" label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'rainfall') return [`${Math.round(value)} mm`, 'Rainfall'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <ReferenceLine 
                  y={stats.avgRainfall} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Average', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Bar dataKey="rainfall" radius={[4, 4, 0, 0]}>
                  {extremeEvents.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[entry.category]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Extreme Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Notable Extreme Events</CardTitle>
          <CardDescription>Years with significant deviation from average</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extremeEvents
              .filter(e => e.category === 'extreme_high' || e.category === 'extreme_low')
              .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
              .map(event => (
                <div
                  key={event.year}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-12 rounded-full"
                      style={{ backgroundColor: categoryColors[event.category] }}
                    />
                    <div>
                      <div className="font-semibold text-foreground">{event.year}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(event.rainfall)} mm total
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={event.category === 'extreme_high' ? 'destructive' : 'secondary'}
                    >
                      {event.deviation > 0 ? '+' : ''}{event.deviation}σ
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {categoryLabels[event.category]}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
