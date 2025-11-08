import { GraphClient } from '../services/graphClient';
import { IEmail } from '../types';

export class EmailTools {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  // 获取未读邮件
  async getUnreadEmails(args: {
    top?: number;
  }): Promise<{ success: boolean; emails?: IEmail[]; error?: string }> {
    try {
      const response = await this.graphClient.getUnreadEmails(args.top || 10);
      
      const emails: IEmail[] = response.value.map((e: any) => ({
        id: e.id,
        subject: e.subject,
        from: e.from?.emailAddress,
        received: e.receivedDateTime,
        isRead: e.isRead,
        body: e.body?.content
      }));

      return {
        success: true,
        emails: emails
      };
    } catch (error) {
      console.error('获取未读邮件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 获取单个邮件详情
  async getEmailById(args: {
    emailId: string;
  }): Promise<{ success: boolean; email?: IEmail; error?: string }> {
    try {
      const response = await this.graphClient.getEmailById(args.emailId);
      
      const email: IEmail = {
        id: response.id,
        subject: response.subject,
        from: response.from?.emailAddress,
        received: response.receivedDateTime,
        isRead: response.isRead,
        body: response.body?.content
      };

      return {
        success: true,
        email: email
      };
    } catch (error) {
      console.error('获取邮件详情失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 获取MCP工具定义
  getTools() {
    return [
      {
        name: 'get_unread_emails',
        description: '获取未读邮件列表',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: '返回邮件数量限制 (默认: 10)',
              default: 10,
              minimum: 1,
              maximum: 50
            }
          }
        }
      },
      {
        name: 'get_email_by_id',
        description: '获取单个邮件详情',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: {
              type: 'string',
              description: '邮件ID'
            }
          },
          required: ['emailId']
        }
      }
    ];
  }
}
