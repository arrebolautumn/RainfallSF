import { RainfallRecord, AnnualRainfall, MonthlyAverage, ExtremeEvent, CorrelationPoint } from '@/types/rainfall';

const getSeason = (month: number): 'Spring' | 'Summer' | 'Autumn' | 'Winter' => {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
};

// Generate mock rainfall records from 1993-2023
export const generateRainfallRecords = (): RainfallRecord[] => {
  const records: RainfallRecord[] = [];
  
  for (let year = 1993; year <= 2023; year++) {
    for (let month = 1; month <= 12; month++) {
      const baseRainfall = 50 + Math.sin((month - 1) * Math.PI / 6) * 40;
      const yearVariation = Math.sin((year - 1993) * 0.3) * 20;
      const randomVariation = (Math.random() - 0.5) * 30;
      
      const rainfall = Math.max(0, baseRainfall + yearVariation + randomVariation);
      const temperature = 15 + Math.sin((month - 1) * Math.PI / 6) * 12 + (Math.random() - 0.5) * 5;
      const humidity = 60 + Math.sin((month - 1) * Math.PI / 6) * 20 + (Math.random() - 0.5) * 15;
      
      records.push({
        year,
        month,
        rainfall: Math.round(rainfall * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        season: getSeason(month),
      });
    }
  }
  
  return records;
};

export const rainfallRecords = generateRainfallRecords();

export const getAnnualRainfall = (): AnnualRainfall[] => {
  const yearlyData: { [key: number]: { rainfall: number; temp: number; humidity: number; count: number } } = {};
  
  rainfallRecords.forEach(record => {
    if (!yearlyData[record.year]) {
      yearlyData[record.year] = { rainfall: 0, temp: 0, humidity: 0, count: 0 };
    }
    yearlyData[record.year].rainfall += record.rainfall;
    yearlyData[record.year].temp += record.temperature;
    yearlyData[record.year].humidity += record.humidity;
    yearlyData[record.year].count++;
  });
  
  return Object.entries(yearlyData).map(([year, data]) => ({
    year: parseInt(year),
    totalRainfall: Math.round(data.rainfall * 10) / 10,
    avgTemperature: Math.round((data.temp / data.count) * 10) / 10,
    avgHumidity: Math.round((data.humidity / data.count) * 10) / 10,
  }));
};

export const getMonthlyAverages = (): MonthlyAverage[] => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData: { [key: number]: number[] } = {};
  
  rainfallRecords.forEach(record => {
    if (!monthlyData[record.month]) {
      monthlyData[record.month] = [];
    }
    monthlyData[record.month].push(record.rainfall);
  });
  
  return Object.entries(monthlyData).map(([month, values]) => ({
    month: monthNames[parseInt(month) - 1],
    avgRainfall: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    minRainfall: Math.round(Math.min(...values) * 10) / 10,
    maxRainfall: Math.round(Math.max(...values) * 10) / 10,
  }));
};

export const getSeasonalHeatmapData = () => {
  const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
  const data: { year: number; season: string; rainfall: number }[] = [];
  
  for (let year = 1993; year <= 2023; year++) {
    seasons.forEach(season => {
      const seasonRecords = rainfallRecords.filter(r => r.year === year && r.season === season);
      const totalRainfall = seasonRecords.reduce((sum, r) => sum + r.rainfall, 0);
      data.push({ year, season, rainfall: Math.round(totalRainfall * 10) / 10 });
    });
  }
  
  return data;
};

export const getExtremeEvents = (): ExtremeEvent[] => {
  const annualData = getAnnualRainfall();
  const avgRainfall = annualData.reduce((sum, d) => sum + d.totalRainfall, 0) / annualData.length;
  const stdDev = Math.sqrt(
    annualData.reduce((sum, d) => sum + Math.pow(d.totalRainfall - avgRainfall, 2), 0) / annualData.length
  );
  
  return annualData.map(d => {
    const deviation = (d.totalRainfall - avgRainfall) / stdDev;
    let category: ExtremeEvent['category'] = 'normal';
    
    if (deviation > 1.5) category = 'extreme_high';
    else if (deviation > 0.75) category = 'high';
    else if (deviation < -1.5) category = 'extreme_low';
    else if (deviation < -0.75) category = 'low';
    
    return {
      year: d.year,
      rainfall: d.totalRainfall,
      deviation: Math.round(deviation * 100) / 100,
      category,
    };
  });
};

export const getCorrelationData = (): CorrelationPoint[] => {
  return rainfallRecords.map(r => ({
    rainfall: r.rainfall,
    temperature: r.temperature,
    humidity: r.humidity,
    year: r.year,
    month: r.month,
  }));
};
