export interface RainfallRecord {
  year: number;
  month: number;
  rainfall: number; // mm
  temperature: number; // °C
  humidity: number; // %
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
}

export interface AnnualRainfall {
  year: number;
  totalRainfall: number;
  avgTemperature: number;
  avgHumidity: number;
}

export interface MonthlyAverage {
  month: string;
  avgRainfall: number;
  minRainfall: number;
  maxRainfall: number;
}

export interface SeasonalData {
  season: string;
  avgRainfall: number;
  years: number[];
}

export interface ExtremeEvent {
  year: number;
  rainfall: number;
  deviation: number;
  category: 'extreme_high' | 'high' | 'normal' | 'low' | 'extreme_low';
}

export interface CorrelationPoint {
  rainfall: number;
  temperature: number;
  humidity: number;
  year: number;
  month: number;
}
