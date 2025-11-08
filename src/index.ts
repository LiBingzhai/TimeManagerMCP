import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// 导入服务和工具
import { GraphClient } from './services/graphClient';
import { ExchangeClient } from './services/exchangeClient';
import { AcademicSystemClient } from './services/academicSystem';
import { CalendarTools } from './tools/calendar';
import { EmailTools } from './tools/email';
import { AcademicTools } from './tools/academic';
import { logger } from './utils/logger';

// 加载环境变量
dotenv.config();


logger.reloadFromEnv();

// 初始化MCP服务器
const server = new Server({
  name: 'mcp-email-calendar-server',
  version: '1.0.0',
});

const initialMailClient = () => {
// 初始化服务客户端
const emailAccessMethod = process.env.EMAIL_ACCESS_METHOD || 'exchange';
const permissionType = (process.env.PERMISSION_TYPE as 'delegated' | 'application') || 'application';
const userEmail = process.env.USER_EMAIL;

logger.start('启动MCP邮件日历服务器...');
logger.data(`邮件访问方式: ${emailAccessMethod}`);
logger.data(`权限类型: ${permissionType}`);
logger.data(`用户邮箱: ${userEmail || '未设置'}`);

let emailService: any;

if (emailAccessMethod === 'graph') {
  logger.graph('使用Microsoft Graph API...');
  // 使用Microsoft Graph API
  emailService = new GraphClient({
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    tenantId: process.env.MICROSOFT_TENANT_ID!,
  }, userEmail, permissionType);
} else {
  logger.exchange('使用Exchange Web Services (默认)...');
  emailService = new ExchangeClient({
    exchangeUrl: process.env.EXCHANGE_URL!,
    username: process.env.EXCHANGE_USERNAME!,
    password: process.env.EXCHANGE_PASSWORD!,
    domain: process.env.EXCHANGE_DOMAIN
  });
}

// EMS初始化后，测试邮件服务可用性
(async () => {
  try {
    if (emailService && typeof emailService.getUnreadEmails === 'function') {
      const testResult = await emailService.getUnreadEmails(1);
      if (testResult && testResult.value !== undefined) {
        logger.success('邮件服务可用，获取未读邮件数量: ' + (testResult.value.length ?? 0));
      } else if (Array.isArray(testResult)) {
        logger.success('邮件服务可用，获取未读邮件数量: ' + testResult.length);
      } else {
        logger.warn('邮件服务测试返回未知格式: ' + JSON.stringify(testResult));
      }
    } else {
      logger.warn('邮件服务未实现getUnreadEmails方法，无法自动检测可用性');
    }
  } catch (err) {
    logger.error('邮件服务可用性检测失败: ' + (err instanceof Error ? err.message : err));
  }
})();
}


const academicClient = new AcademicSystemClient({
  baseUrl: process.env.ACADEMIC_SYSTEM_URL!,
  username: process.env.ACADEMIC_SYSTEM_USERNAME!,
  password: process.env.ACADEMIC_SYSTEM_PASSWORD!,
});

// 初始化工具
const calendarTools = new CalendarTools(emailService);
const emailTools = new EmailTools(emailService);
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
  const { name, token, arguments: args } = request.params;

  try {
    switch (name) {
      // 日历工具
      case 'add_calendar_event':
        return await calendarTools.addCalendarEvent(token, args as any);
      
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
  console.log('MCP服务器已启动，访问地址: ' + process.env.PORT);
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});
