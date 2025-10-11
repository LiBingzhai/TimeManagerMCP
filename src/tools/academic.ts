import { AcademicSystemClient } from '../services/academicSystem';
import { CourseSchedule } from '../types';

export class AcademicTools {
  private academicClient: AcademicSystemClient;

  constructor(academicClient: AcademicSystemClient) {
    this.academicClient = academicClient;
  }

  // 获取课程表
  async getCourseSchedule(args: {
    semester?: string;
  }): Promise<{ success: boolean; courses?: CourseSchedule[]; error?: string }> {
    try {
      const courses = await this.academicClient.getCourseSchedule(args.semester);
      
      return {
        success: true,
        courses
      };
    } catch (error) {
      console.error('获取课程表失败:', error);
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
        name: 'get_course_schedule',
        description: '获取西交利物浦大学教务系统课程表',
        inputSchema: {
          type: 'object',
          properties: {
            semester: {
              type: 'string',
              description: '学期 (可选，如: 2024-1, 2024-2)'
            }
          }
        }
      }
    ];
  }
}
