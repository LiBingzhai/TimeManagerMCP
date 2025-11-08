import { GraphClient } from '../services/graphClient';
import { IEvent } from '../types';

export class CalendarTools {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  // 添加日程到日历
  async addCalendarEvent(
    token:string,
    args: {
    subject: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    location?: string;
    body?: string;
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // Adapt to the structure expected by graphClient
      const graphEvent: any = {
        subject: args.subject,
        start: {
          dateTime: args.startDateTime,
          timeZone: args.timeZone || 'Asia/Shanghai'
        },
        end: {
          dateTime: args.endDateTime,
          timeZone: args.timeZone || 'Asia/Shanghai'
        }
      };

      if (args.location) {
        graphEvent.location = {
          displayName: args.location
        };
      }

      if (args.body) {
        graphEvent.body = {
          content: args.body,
          contentType: 'text'
        };
      }

      const response = await this.graphClient.createEvent(graphEvent);
      
      return {
        success: true,
        eventId: response.id
      };
    } catch (error) {
      console.error('添加日历事件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 获取日历中的日程
  async getCalendarEvents(args: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; events?: IEvent[]; error?: string }> {
    try {
      const response = await this.graphClient.getEvents(args.startDate, args.endDate);
      
      // Adapt the response from graphClient to IEvent[]
      const events: IEvent[] = response.value.map((e: any) => ({
        id: e.id,
        subject: e.subject,
        start: e.start.dateTime,
        end: e.end.dateTime,
        location: e.location?.displayName,
        body: e.body?.content
      }));

      return {
        success: true,
        events: events
      };
    } catch (error) {
      console.error('获取日历事件失败:', error);
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
        name: 'add_calendar_event',
        description: '添加日程到Exchange日历',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: '事件标题'
            },
            startDateTime: {
              type: 'string',
              description: '开始时间 (ISO 8601格式，如: 2024-01-15T09:00:00)'
            },
            endDateTime: {
              type: 'string',
              description: '结束时间 (ISO 8601格式，如: 2024-01-15T10:00:00)'
            },
            timeZone: {
              type: 'string',
              description: '时区 (默认: Asia/Shanghai)',
              default: 'Asia/Shanghai'
            },
            location: {
              type: 'string',
              description: '地点 (可选)'
            },
            body: {
              type: 'string',
              description: '事件描述 (可选)'
            }
          },
          required: ['subject', 'startDateTime', 'endDateTime']
        }
      },
      {
        name: 'get_calendar_events',
        description: '获取日历中的日程',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: '开始日期 (ISO 8601格式，如: 2024-01-15)'
            },
            endDate: {
              type: 'string',
              description: '结束日期 (ISO 8601格式，如: 2024-01-31)'
            }
          }
        }
      }
    ];
  }
}
