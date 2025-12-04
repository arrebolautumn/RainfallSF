import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMonthlyAverages, getSeasonalHeatmapData } from '@/data/mockRainfallData';

const monthlyData = getMonthlyAverages();
const seasonalHeatmap = getSeasonalHeatmapData();

const seasonColors: { [key: string]: string } = {
  Winter: 'hsl(var(--primary))',
  Spring: 'hsl(var(--rainfall-success))',
  Summer: 'hsl(var(--rainfall-warning))',
  Autumn: 'hsl(var(--accent))',
};

const monthColors = [
  'hsl(199, 89%, 48%)', // Jan
  'hsl(199, 89%, 52%)', // Feb
  'hsl(158, 64%, 52%)', // Mar
  'hsl(158, 64%, 48%)', // Apr
  'hsl(158, 64%, 44%)', // May
  'hsl(43, 96%, 56%)',  // Jun
  'hsl(43, 96%, 52%)',  // Jul
  'hsl(43, 96%, 48%)',  // Aug
  'hsl(172, 66%, 50%)', // Sep
  'hsl(172, 66%, 46%)', // Oct
  'hsl(172, 66%, 42%)', // Nov
  'hsl(199, 89%, 44%)', // Dec
];

export function SeasonalAnalysis() {
  const seasonalSummary = useMemo(() => {
    const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
    return seasons.map(season => {
      const seasonData = seasonalHeatmap.filter(d => d.season === season);
      const avg = seasonData.reduce((sum, d) => sum + d.rainfall, 0) / seasonData.length;
      const max = Math.max(...seasonData.map(d => d.rainfall));
      const min = Math.min(...seasonData.map(d => d.rainfall));
      return { season, avg: Math.round(avg), max: Math.round(max), min: Math.round(min) };
    });
  }, []);

  // Create heatmap data for visualization
  const heatmapGrid = useMemo(() => {
    const years = Array.from(new Set(seasonalHeatmap.map(d => d.year))).sort();
    const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
    
    return years.map(year => {
      const row: { year: number; [key: string]: number } = { year };
      seasons.forEach(season => {
        const data = seasonalHeatmap.find(d => d.year === year && d.season === season);
        row[season] = data ? data.rainfall : 0;
      });
      return row;
    });
  }, []);

  const getHeatmapColor = (value: number) => {
    const maxValue = Math.max(...seasonalHeatmap.map(d => d.rainfall));
    const minValue = Math.min(...seasonalHeatmap.map(d => d.rainfall));
    const normalized = (value - minValue) / (maxValue - minValue);
    const lightness = 90 - normalized * 50;
    return `hsl(199, 89%, ${lightness}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Season Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {seasonalSummary.map(season => (
          <Card key={season.season} className="relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-10" 
              style={{ backgroundColor: seasonColors[season.season] }}
            />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{season.season}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{season.avg} mm</div>
              <p className="text-xs text-muted-foreground">
                Range: {season.min} - {season.max} mm
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Rainfall Distribution</CardTitle>
          <CardDescription>Average rainfall by month with min/max ranges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => [`${value} mm`, name]}
                />
                <Legend />
                <Bar dataKey="avgRainfall" name="Average Rainfall" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={monthColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Rainfall Heatmap</CardTitle>
          <CardDescription>Visual intensity map by year and season</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-xs text-muted-foreground">Low</span>
                <div className="flex h-3 w-32 rounded overflow-hidden">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: `hsl(199, 89%, ${90 - i * 5}%)` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">High</span>
              </div>

              {/* Heatmap Grid */}
              <div className="grid gap-1">
                {/* Header */}
                <div className="grid grid-cols-[60px_repeat(4,1fr)] gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Year</div>
                  {['Winter', 'Spring', 'Summer', 'Autumn'].map(season => (
                    <div key={season} className="text-xs font-medium text-center text-muted-foreground">
                      {season}
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {heatmapGrid.map(row => (
                  <div key={row.year} className="grid grid-cols-[60px_repeat(4,1fr)] gap-1">
                    <div className="text-xs text-muted-foreground flex items-center">{row.year}</div>
                    {['Winter', 'Spring', 'Summer', 'Autumn'].map(season => (
                      <div
                        key={season}
                        className="h-6 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-default"
                        style={{ 
                          backgroundColor: getHeatmapColor(row[season] as number),
                          color: row[season] > 200 ? 'white' : 'hsl(var(--foreground))'
                        }}
                        title={`${season} ${row.year}: ${Math.round(row[season] as number)} mm`}
                      >
                        {Math.round(row[season] as number)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
