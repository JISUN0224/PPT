export interface SlideData {
  slideNumber: number;
  type: 'title' | 'content' | 'chart' | 'comparison' | 'conclusion';
  title: string;
  subtitle?: string;
  content?: string;
  points?: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  chartData?: any;
  stats?: Array<{ value: string; label: string }>;
  audioStartTime?: number;
  audioEndTime?: number;
}

export interface PPTData {
  title: string;
  slides: SlideData[];
  audioUrl?: string;
}

export interface GeneratePPTParams {
  topic: string;
  details?: string;
  style: 'business' | 'academic' | 'creative' | 'technical';
  slideCount: number;
} 