import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// 导入服务和工具
import { GraphClient } from './services/graphClient';
import { AcademicSystemClient } from './services/academicSystem';
import { CalendarTools } from './tools/calendar';
import { EmailTools } from './tools/email';
import { AcademicTools } from './tools/academic';

// 加载环境变量
dotenv.config();

// 初始化MCP服务器
const server = new Server({
  name: 'mcp-email-calendar-server',
  version: '1.0.0',
});

// 初始化服务客户端
const graphClient = new GraphClient({
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  tenantId: process.env.MICROSOFT_TENANT_ID!,
});

const academicClient = new AcademicSystemClient({
  baseUrl: process.env.ACADEMIC_SYSTEM_URL!,
  username: process.env.ACADEMIC_SYSTEM_USERNAME!,
  password: process.env.ACADEMIC_SYSTEM_PASSWORD!,
});

// 初始化工具
const calendarTools = new CalendarTools(graphClient);
const emailTools = new EmailTools(graphClient);
const academicTools = new AcademicTools(academicClient);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const allTools = [
    ...calendarTools.getTools(),
    ...emailTools.getTools(),
    ...academicTools.getTools(),
  ];

  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // 日历工具
      case 'add_calendar_event':
        return await calendarTools.addCalendarEvent(args as any);
      
      case 'get_calendar_events':
        return await calendarTools.getCalendarEvents(args as any);
      
      // 邮件工具
      case 'get_unread_emails':
        return await emailTools.getUnreadEmails(args as any);
      
      case 'get_email_by_id':
        return await emailTools.getEmailById(args as any);
      
      // 教务系统工具
      case 'get_course_schedule':
        return await academicTools.getCourseSchedule(args as any);
      
      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    console.error(`工具 ${name} 执行失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('MCP服务器已启动');
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});
