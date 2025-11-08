// 通用类型定义

import { GraphClient } from "../services/graphClient";

export interface IEmail {
  id: string;
  subject: string;
  from?: {
    name: string;
    address: string;
  };
  received: string;
  isRead: boolean;
  body?: string;
}

export interface IEvent {
  id?: string;
  subject: string;
  start: string;
  end: string;
  location?: string;
  body?: string;
  attendees?: string[];
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

export interface ExchangeConfig {
  exchangeUrl: string;
  username: string;
  password: string;
  domain?: string;
}

export interface User{
  token: string;
  username: string;
  email: GraphClient;
}