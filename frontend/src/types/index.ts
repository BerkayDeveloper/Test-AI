export interface TestCase {
  id: string;
  title: string;
  type: string;
  testType?: string;
  description?: string;
  priority: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  targetComponent?: string;
  automationSnippet?: string;
  status?: string;
}

export interface SecondTimelineItem {
  second: number;
  timestamp: string;
  diffPercent: number;
  activeRegion: string;
  hotspot?: { xPercent: number; yPercent: number };
  eventType: string;
  screenName: string;
  whatHappened: string;
  qaCheckRequirement: string;
  thumbnailDataUrl?: string;
}

export interface VideoInsightItem {
  videoIndex: number;
  videoName: string;
  mediaType?: "video" | "image";
  duration?: string;
  durationSeconds?: number;
  resolution?: string;
  analyzedSecondsCount?: number;
  screens: string[];
  userActions: string[];
  issues: string[];
  flowSummary: string;
  secondBySecondTimeline?: SecondTimelineItem[];
  generatedTestCount?: number;
}

export interface TestPlanResult {
  id: string;
  title: string;
  category: string;
  overview: string;
  totalTestCount: number;
  criticalTestCount: number;
  testCases: TestCase[];
  createdAt: string;
  previousContent?: string;
  newContent?: string;
  detectedLanguage?: string;
  persona?: "qa" | "developer";
  riskLevel?: string;
  riskScore?: number;
  isSaved?: boolean;
  videoInsights?: VideoInsightItem[];
}

export interface TemplateItem {
  name: string;
  category: string;
  title: string;
  oldCode: string;
  newCode: string;
  isCustom?: boolean;
  persona?: "qa" | "developer";
}

export interface AnalysisHistoryItem {
  id: string;
  title: string;
  category: string;
  diffSummary: string;
  riskLevel: string;
  riskScore: number;
  previousContent: string;
  newContent: string;
  createdAt: string;
  testCases: TestCase[];
  impactAreas: string[];
  totalTestCount: number;
  persona?: "qa" | "developer";
  videoInsights?: VideoInsightItem[];
}
