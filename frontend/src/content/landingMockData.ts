/**
 * Mock data for Inventra Hero Live Forecast Chart
 * Daily Footfall & Sales Forecast vs Run-Rate
 */

export interface DailyForecastPoint {
  day: string;
  fullName: string;
  sales: number; // in ₹
  footfall: number;
  runRate: number; // baseline
  isPeak?: boolean;
}

export const heroForecastData: DailyForecastPoint[] = [
  { day: 'Mon', fullName: 'Monday', sales: 38500, footfall: 310, runRate: 42000 },
  { day: 'Tue', fullName: 'Tuesday', sales: 47600, footfall: 385, runRate: 42000 },
  { day: 'Wed', fullName: 'Wednesday', sales: 43400, footfall: 350, runRate: 42000 },
  { day: 'Thu', fullName: 'Thursday', sales: 52500, footfall: 420, runRate: 42000 },
  { day: 'Fri', fullName: 'Friday', sales: 57400, footfall: 460, runRate: 42000 },
  { day: 'Sat', fullName: 'Saturday', sales: 79800, footfall: 640, runRate: 42000, isPeak: true },
  { day: 'Sun', fullName: 'Sunday', sales: 83200, footfall: 670, runRate: 42000, isPeak: true },
];

export default heroForecastData;
