import { GraphClient } from './graphClient';
import { ExchangeClient } from './exchangeClient';
import { GraphConfig, ExchangeConfig } from '../types';

export interface EmailService {
  getUnreadEmails(top?: number): Promise<any>;
  getEmailById(emailId: string): Promise<any>;
  createEvent(event: any): Promise<any>;
  getEvents(startDate?: string, endDate?: string): Promise<any>;
}

export class EmailServiceFactory {
  static createService(
    method: 'graph' | 'exchange',
    graphConfig?: GraphConfig,
    exchangeConfig?: ExchangeConfig,
    userEmail?: string,
    permissionType?: 'delegated' | 'application'
  ): EmailService {
    switch (method) {
      case 'graph':
        if (!graphConfig) {
          throw new Error('Graph配置缺失');
        }
        return new GraphClient(graphConfig, userEmail, permissionType);
      
      case 'exchange':
        if (!exchangeConfig) {
          throw new Error('Exchange配置缺失');
        }
        return new ExchangeClient(exchangeConfig);
      
      default:
        throw new Error(`不支持的邮件访问方法: ${method}`);
    }
  }

  static getAvailableMethods(): string[] {
    return ['graph', 'exchange'];
  }

  static getMethodDescription(method: string): string {
    const descriptions: Record<string, string> = {
      'graph': 'Microsoft Graph API - 适用于Microsoft 365集成环境',
      'exchange': 'Exchange Web Services - 适用于本地部署的Exchange服务器'
    };
    return descriptions[method] || '未知方法';
  }
}
