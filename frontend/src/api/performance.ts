import api from './axios';

export interface PerformanceFilterParams {
  range?: string;
  from?: string;
  to?: string;
  projectId?: string;
  teamId?: string;
  search?: string;
}

export interface EmployeePerformanceRow {
  userId: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  teamName: string;
  totalLeads: number;
  calls: number;
  connectedCalls: number;
  connectedRate: number;
  followupsCompleted: number;
  followupsOverdue: number;
  siteVisits: number;
  dealsWon: number;
  conversionRate: number;
  eodDays: number;
  workingDays: number;
  eodSubmitted: string;
  isZeroActivity: boolean;
  isHighOverdue: boolean;
  rank?: number;
}

export interface TeamPerformanceTotals {
  totalLeads: number;
  calls: number;
  connectedCalls: number;
  connectedRate: number;
  followupsCompleted: number;
  followupsOverdue: number;
  siteVisits: number;
  dealsWon: number;
  conversionRate: number;
}

export interface TeamPerformanceResponse {
  success: boolean;
  range: string;
  from: string;
  to: string;
  workingDays: number;
  totals: TeamPerformanceTotals;
  employees: EmployeePerformanceRow[];
}

export interface EmployeeTeamDetailResponse {
  success: boolean;
  range: string;
  from: string;
  to: string;
  workingDays: number;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId: string;
    role: string;
    teamName: string;
  };
  performance: {
    winRate: number;
    opportunitiesWon: number;
    leadsOwned: number;
    followupsCompleted: number;
    followupsOverdue: number;
    siteVisitsCompleted: number;
    calls: number;
    connectedCalls: number;
    connectedRate: number;
    eodDays: number;
    workingDays: number;
    eodSubmitted: string;
  };
}

// Get Team Performance summary & employee rows
export async function getTeamPerformance(params?: PerformanceFilterParams): Promise<TeamPerformanceResponse> {
  const response = await api.get('/performance/team', { params });
  return response.data;
}

// Get single employee drilldown within team performance
export async function getEmployeeTeamDetail(
  userId: string,
  params?: { range?: string; from?: string; to?: string; projectId?: string }
): Promise<EmployeeTeamDetailResponse> {
  const response = await api.get(`/performance/team/${userId}`, { params });
  return response.data;
}
