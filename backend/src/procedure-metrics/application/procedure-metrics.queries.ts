export interface ProcedureActivityMetric {
  procedureId: number;
  procedureName: string;
  executions: number;
  previousExecutions: number;
  shots: number;
  previousShots: number;
  options: { variationId: number; name: string; executions: number }[];
  materials: {
    stockItemId: number;
    materialName: string;
    used: number;
    small: number;
    notUsed: number;
  }[];
}
export abstract class ProcedureMetricsQueries {
  abstract monthly(month: string): Promise<{
    month: string;
    previousMonth: string;
    procedures: ProcedureActivityMetric[];
  }>;
}
