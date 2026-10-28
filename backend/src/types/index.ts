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

export interface CodeEntity {
  name: string;
  kind: "class" | "function" | "method" | "struct" | "interface";
  signature?: string;
  logicSnippet?: string;
  contextLines: string[];
}

export interface TestPlanResult {
  id: string;
  title: string;
  category: string;
  overview: string;
  detectedLanguage: string;
  totalTestCount: number;
  criticalTestCount: number;
  testCases: TestCase[];
  createdAt: string;
  previousContent?: string;
  newContent?: string;
}

export interface TemplateItem {
  name: string;
  category: string;
  title: string;
  oldCode: string;
  newCode: string;
  isCustom?: boolean;
}

export interface AnalysisRecord {
  id: string;
  title: string;
  category: string;
  previousContent: string;
  newContent: string;
  diffSummary: string;
  riskLevel: string;
  riskScore: number;
  impactAreas: string; // JSON string
  recommendations: string; // JSON string
  createdAt: Date;
}
