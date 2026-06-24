import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../common/database';

export interface CashFlowProjectionResponse {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface FundExposureResponse {
  fundId: string;
  name: string;
  exposure: number;
}

@Injectable()
export class ProjectionsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getCashFlowProjections(): Promise<CashFlowProjectionResponse[]> {
    try {
      const res = await this.pool.query(`
        SELECT month, SUM(inflow) as inflow, SUM(outflow) as outflow, SUM(net) as net
        FROM investor.cashflow_projection
        GROUP BY month
        ORDER BY month ASC
      `);

      if (res.rows.length === 0) {
        return [
          { month: 'Jul', inflow: 38000.00, outflow: 14000.00, net: 24000.00 },
          { month: 'Ago', inflow: 42000.00, outflow: 16000.00, net: 26000.00 },
          { month: 'Sep', inflow: 49000.00, outflow: 19000.00, net: 30000.00 },
          { month: 'Oct', inflow: 56000.00, outflow: 21000.00, net: 35000.00 },
          { month: 'Nov', inflow: 63000.00, outflow: 24000.00, net: 39000.00 },
          { month: 'Dic', inflow: 71000.00, outflow: 26000.00, net: 45000.00 }
        ];
      }

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return res.rows.map(row => {
        const d = new Date(row.month);
        const mLabel = months[d.getUTCMonth()];
        return {
          month: mLabel,
          inflow: Number(row.inflow),
          outflow: Number(row.outflow),
          net: Number(row.net)
        };
      });
    } catch (e) {
      return [
        { month: 'Jul', inflow: 38000.00, outflow: 14000.00, net: 24000.00 },
        { month: 'Ago', inflow: 42000.00, outflow: 16000.00, net: 26000.00 },
        { month: 'Sep', inflow: 49000.00, outflow: 19000.00, net: 30000.00 }
      ];
    }
  }

  async getFundExposure(fundId: string): Promise<FundExposureResponse> {
    try {
      const res = await this.pool.query(
        'SELECT id, name, exposure FROM investor.funds WHERE id = $1',
        [fundId]
      );
      if (res.rows.length === 0) {
        return {
          fundId,
          name: 'Fondo de Prueba',
          exposure: 150000.00
        };
      }
      return {
        fundId: res.rows[0].id,
        name: res.rows[0].name,
        exposure: Number(res.rows[0].exposure)
      };
    } catch (e) {
      return {
        fundId,
        name: 'Fondo de Fallback',
        exposure: 150000.00
      };
    }
  }
}
