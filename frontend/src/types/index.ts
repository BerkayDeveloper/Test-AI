export interface TestCase {
  id: string;
  title: string;
  type: string;
  priority: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  targetComponent?: string;
  automationSnippet?: string;
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
}

export interface TemplateItem {
  name: string;
  category: string;
  title: string;
  oldCode: string;
  newCode: string;
  isCustom?: boolean;
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
}
