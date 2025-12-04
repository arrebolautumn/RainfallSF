import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getCorrelationData } from '@/data/mockRainfallData';

const correlationData = getCorrelationData();

type Variable = 'rainfall' | 'temperature' | 'humidity';

const variableLabels: Record<Variable, string> = {
  rainfall: 'Rainfall (mm)',
  temperature: 'Temperature (°C)',
  humidity: 'Humidity (%)',
};

export function CorrelationAnalysis() {
  const [xVariable, setXVariable] = useState<Variable>('temperature');
  const [yVariable, setYVariable] = useState<Variable>('rainfall');

  const correlation = useMemo(() => {
    const n = correlationData.length;
    const xValues = correlationData.map(d => d[xVariable]);
    const yValues = correlationData.map(d => d[yVariable]);
    
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xDenom += xDiff * xDiff;
      yDenom += yDiff * yDiff;
    }
    
    const r = numerator / Math.sqrt(xDenom * yDenom);
    return Math.round(r * 100) / 100;
  }, [xVariable, yVariable]);

  const getCorrelationStrength = (r: number) => {
    const absR = Math.abs(r);
    if (absR >= 0.7) return { label: 'Strong', variant: 'default' as const };
    if (absR >= 0.4) return { label: 'Moderate', variant: 'secondary' as const };
    return { label: 'Weak', variant: 'outline' as const };
  };

  const correlationInfo = getCorrelationStrength(correlation);

  const scatterData = useMemo(() => {
    return correlationData.map(d => ({
      x: d[xVariable],
      y: d[yVariable],
      z: 100,
      year: d.year,
      month: d.month,
    }));
  }, [xVariable, yVariable]);

  // Calculate all correlations for the matrix
  const correlationMatrix = useMemo(() => {
    const variables: Variable[] = ['rainfall', 'temperature', 'humidity'];
    const matrix: { var1: Variable; var2: Variable; r: number }[] = [];
    
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const var1 = variables[i];
        const var2 = variables[j];
        
        const n = correlationData.length;
        const xValues = correlationData.map(d => d[var1]);
        const yValues = correlationData.map(d => d[var2]);
        
        const xMean = xValues.reduce((a, b) => a + b, 0) / n;
        const yMean = yValues.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let xDenom = 0;
        let yDenom = 0;
        
        for (let k = 0; k < n; k++) {
          const xDiff = xValues[k] - xMean;
          const yDiff = yValues[k] - yMean;
          numerator += xDiff * yDiff;
          xDenom += xDiff * xDiff;
          yDenom += yDiff * yDiff;
        }
        
        const r = numerator / Math.sqrt(xDenom * yDenom);
        matrix.push({ var1, var2, r: Math.round(r * 100) / 100 });
      }
    }
    
    return matrix;
  }, []);

  return (
    <div className="space-y-6">
      {/* Correlation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Matrix</CardTitle>
          <CardDescription>Pearson correlation coefficients between variables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {correlationMatrix.map(({ var1, var2, r }) => {
              const strength = getCorrelationStrength(r);
              const bgOpacity = Math.abs(r) * 0.3;
              const isPositive = r >= 0;
              
              return (
                <div
                  key={`${var1}-${var2}`}
                  className="p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer"
                  style={{
                    backgroundColor: isPositive 
                      ? `hsla(var(--rainfall-success), ${bgOpacity})` 
                      : `hsla(var(--rainfall-danger), ${bgOpacity})`,
                  }}
                  onClick={() => {
                    setXVariable(var1);
                    setYVariable(var2);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {variableLabels[var1].split(' ')[0]} vs {variableLabels[var2].split(' ')[0]}
                    </span>
                    <Badge variant={strength.variant}>{strength.label}</Badge>
                  </div>
                  <div className={`text-2xl font-bold ${isPositive ? 'text-rainfall-success' : 'text-rainfall-danger'}`}>
                    r = {r}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Scatter Plot Analysis</CardTitle>
              <CardDescription>Explore relationships between variables</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={correlationInfo.variant}>
                {correlationInfo.label} Correlation: r = {correlation}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Variable Selectors */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">X-Axis Variable</label>
              <Select value={xVariable} onValueChange={(v) => setXVariable(v as Variable)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rainfall">Rainfall (mm)</SelectItem>
                  <SelectItem value="temperature">Temperature (°C)</SelectItem>
                  <SelectItem value="humidity">Humidity (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Y-Axis Variable</label>
              <Select value={yVariable} onValueChange={(v) => setYVariable(v as Variable)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rainfall">Rainfall (mm)</SelectItem>
                  <SelectItem value="temperature">Temperature (°C)</SelectItem>
                  <SelectItem value="humidity">Humidity (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scatter Plot */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={variableLabels[xVariable]}
                  className="text-xs"
                  label={{ value: variableLabels[xVariable], position: 'bottom', offset: 0 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={variableLabels[yVariable]}
                  className="text-xs"
                  label={{ value: variableLabels[yVariable], angle: -90, position: 'insideLeft' }}
                />
                <ZAxis type="number" dataKey="z" range={[20, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => [value.toFixed(1), name]}
                />
                <Scatter
                  data={scatterData}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
