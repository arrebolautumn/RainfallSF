import { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMonthlyAverages, getSeasonalHeatmapData } from '@/data/RainfallData';

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

interface MonthlyData {
  month: string;
  avgRainfall: number;
  minRainfall: number;
  maxRainfall: number;
}

interface SeasonalData {
  year: number;
  season: string;
  rainfall: number;
}

export function SeasonalAnalysis() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [seasonalHeatmap, setSeasonalHeatmap] = useState<SeasonalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'season'>('month');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [monthly, seasonal] = await Promise.all([
          getMonthlyAverages(),
          getSeasonalHeatmapData(),
        ]);
        setMonthlyData(monthly);
        setSeasonalHeatmap(seasonal);
      } catch (error) {
        console.error('Error loading seasonal data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const seasonalSummary = useMemo(() => {
    if (seasonalHeatmap.length === 0) return [];
    
    const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
    return seasons.map(season => {
      const seasonData = seasonalHeatmap.filter(d => d.season === season);
      if (seasonData.length === 0) {
        return { season, avg: 0, max: 0, min: 0 };
      }
      const avg = seasonData.reduce((sum, d) => sum + d.rainfall, 0) / seasonData.length;
      const max = Math.max(...seasonData.map(d => d.rainfall));
      const min = Math.min(...seasonData.map(d => d.rainfall));
      return { season, avg: Math.round(avg), max: Math.round(max), min: Math.round(min) };
    });
  }, [seasonalHeatmap]);

  // Aggregate seasonal data for bar chart
  const seasonalBarData = useMemo(() => {
    if (seasonalHeatmap.length === 0) return [];
    
    const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
    return seasons.map(season => {
      const seasonData = seasonalHeatmap.filter(d => d.season === season);
      if (seasonData.length === 0) {
        return { season, avgRainfall: 0 };
      }
      const avg = seasonData.reduce((sum, d) => sum + d.rainfall, 0) / seasonData.length;
      return { season, avgRainfall: Math.round(avg * 10) / 10 };
    });
  }, [seasonalHeatmap]);

  const heatmapGrid = useMemo(() => {
    if (seasonalHeatmap.length === 0) return [];
    
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
  }, [seasonalHeatmap]);

  const getHeatmapColor = (value: number) => {
    if (seasonalHeatmap.length === 0) return 'hsl(199, 89%, 90%)';
    
    const maxValue = Math.max(...seasonalHeatmap.map(d => d.rainfall));
    const minValue = Math.min(...seasonalHeatmap.map(d => d.rainfall));
    const normalized = (value - minValue) / (maxValue - minValue);
    const lightness = 90 - normalized * 50;
    return `hsl(199, 89%, ${lightness}%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Monthly/Seasonal Distribution with Toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                {viewMode === 'month' ? 'Monthly' : 'Seasonal'} Rainfall Distribution
              </CardTitle>
              <CardDescription>
                {viewMode === 'month' 
                  ? 'Average rainfall by month across all years'
                  : 'Average rainfall by season across all years'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'season' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('season')}
              >
                Season
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={viewMode === 'month' ? monthlyData : seasonalBarData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey={viewMode === 'month' ? 'month' : 'season'} 
                  className="text-xs" 
                />
                <YAxis className="text-xs" label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number) => [`${value} mm`, 'Average Rainfall']}
                />
                <Legend />
                <Bar dataKey="avgRainfall" name="Average Rainfall" radius={[4, 4, 0, 0]}>
                  {viewMode === 'month' 
                    ? monthlyData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={monthColors[index]} />
                      ))
                    : seasonalBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={seasonColors[entry.season]} />
                      ))
                  }
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