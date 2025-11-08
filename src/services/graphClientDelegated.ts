import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { GraphConfig } from '../types';

export class GraphClientDelegated {
  private client: Client;
  private credential: ClientSecretCredential;
  private userEmail: string;

  constructor(config: GraphConfig, userEmail: string) {
    this.userEmail = userEmail;
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await this.credential.getToken([
            'https://graph.microsoft.com/.default'
          ]);
          return tokenResponse?.token || '';
        }
      }
    });
  }

  // 日历相关方法 - 使用用户特定端点
  async createEvent(event: any) {
    try {
      const response = await this.client
        .api(`/users/${this.userEmail}/calendar/events`)
        .post(event);
      return response;
    } catch (error) {
      console.error('创建日历事件失败:', error);
      throw error;
    }
  }

  async getEvents(startDate?: string, endDate?: string) {
    try {
      let query = `/users/${this.userEmail}/calendar/events`;
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDateTime', startDate);
      }
      if (endDate) {
        params.append('endDateTime', endDate);
      }
      
      if (params.toString()) {
        query += '?' + params.toString();
      }

      const response = await this.client.api(query).get();
      return response;
    } catch (error) {
      console.error('获取日历事件失败:', error);
      throw error;
    }
  }

  // 邮件相关方法 - 使用用户特定端点
  async getUnreadEmails(top: number = 10) {
    try {
      const response = await this.client
        .api(`/users/${this.userEmail}/messages`)
        .filter('isRead eq false')
        .top(top)
        .orderby('receivedDateTime desc')
        .get();
      return response;
    } catch (error) {
      console.error('获取未读邮件失败:', error);
      throw error;
    }
  }

  async getEmailById(emailId: string) {
    try {
      const response = await this.client
        .api(`/users/${this.userEmail}/messages/${emailId}`)
        .get();
      return response;
    } catch (error) {
      console.error('获取邮件详情失败:', error);
      throw error;
    }
  }
}
