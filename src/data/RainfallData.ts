import Papa from 'papaparse';
import { RainfallRecord, AnnualRainfall, ExtremeEvent, CorrelationPoint } from '@/types/rainfall';

interface CSVRow {
  tavg: string;
  tmin: string;
  tmax: string;
  prcp: string;
  snow?: string;
  wdir?: string;
  wspd?: string;
  wpgt?: string;
  pres?: string;
  tsun?: string;
}

const getSeason = (month: number): 'Spring' | 'Summer' | 'Autumn' | 'Winter' => {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
};

const estimateHumidity = (temp: number, month: number): number => {
  const baseHumidity = 65;
  const seasonalVariation = Math.sin((month - 1) * Math.PI / 6) * 15;
  return Math.max(40, Math.min(90, baseHumidity + seasonalVariation));
};

let cachedData: RainfallRecord[] | null = null;

export const loadRainfallData = async (): Promise<RainfallRecord[]> => {
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch('/data/san_francisco_weather_data.csv');
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse<CSVRow>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const records: RainfallRecord[] = [];

          const monthlyData: { [key: string]: { prcp: number[]; tavg: number[]; count: number } } = {};
          
          results.data.forEach((row: any, index: number) => {
            try {
              if (row.prcp === null || row.prcp === undefined || row.tavg === null || row.tavg === undefined) {
                return;
              }

              const startDate = new Date('1993-01-01');
              const currentDate = new Date(startDate);
              currentDate.setDate(startDate.getDate() + index);
              
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const key = `${year}-${month}`;

              if (!monthlyData[key]) {
                monthlyData[key] = { prcp: [], tavg: [], count: 0 };
              }

              monthlyData[key].prcp.push(parseFloat(row.prcp) || 0);
              monthlyData[key].tavg.push(parseFloat(row.tavg) || 0);
              monthlyData[key].count++;
            } catch (error) {
              console.warn(`Error processing row ${index}:`, error);
            }
          });

          Object.entries(monthlyData).forEach(([key, data]) => {
            const [year, month] = key.split('-').map(Number);
            const totalRainfall = data.prcp.reduce((sum, val) => sum + val, 0);
            const avgTemp = data.tavg.reduce((sum, val) => sum + val, 0) / data.count;
            const humidity = estimateHumidity(avgTemp, month);

            records.push({
              year,
              month,
              rainfall: Math.round(totalRainfall * 10) / 10,
              temperature: Math.round(avgTemp * 10) / 10,
              humidity: Math.round(humidity * 10) / 10,
              season: getSeason(month),
            });
          });

          records.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

          cachedData = records;
          resolve(records);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error loading CSV file:', error);
    throw error;
  }
};

export const getAnnualRainfall = async (): Promise<AnnualRainfall[]> => {
  const records = await loadRainfallData();
  const yearlyData: { [key: number]: { rainfall: number; temp: number; humidity: number; count: number } } = {};
  
  records.forEach(record => {
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

export const getExtremeEvents = async (): Promise<ExtremeEvent[]> => {
  const annualData = await getAnnualRainfall();
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

export const getCorrelationData = async (): Promise<CorrelationPoint[]> => {
  const records = await loadRainfallData();
  return records.map(r => ({
    rainfall: r.rainfall,
    temperature: r.temperature,
    humidity: r.humidity,
    year: r.year,
    month: r.month,
  }));
};

export const getMonthlyAverages = async () => {
  const records = await loadRainfallData();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData: { [key: number]: number[] } = {};
  
  records.forEach(record => {
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

export const getSeasonalHeatmapData = async () => {
  const records = await loadRainfallData();
  const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
  const data: { year: number; season: string; rainfall: number }[] = [];
  
  const yearSet = new Set(records.map(r => r.year));
  const years = Array.from(yearSet).sort((a, b) => a - b);
  
  years.forEach(year => {
    seasons.forEach(season => {
      const seasonRecords = records.filter(r => r.year === year && r.season === season);
      const totalRainfall = seasonRecords.reduce((sum, r) => sum + r.rainfall, 0);
      data.push({ year, season, rainfall: Math.round(totalRainfall * 10) / 10 });
    });
  });
  
  return data;
};