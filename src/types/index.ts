// 通用类型定义

export interface CalendarEvent {
  id?: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  toRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
}

export interface CourseSchedule {
  courseName: string;
  courseCode: string;
  instructor: string;
  location: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  semester: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface AcademicSystemConfig {
  baseUrl: string;
  username: string;
  password: string;
}
