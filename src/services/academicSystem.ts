import axios, { AxiosInstance } from 'axios';
import { AcademicSystemConfig, CourseSchedule } from '../types';

export class AcademicSystemClient {
  private client: AxiosInstance;
  private config: AcademicSystemConfig;
  private sessionCookie?: string;

  constructor(config: AcademicSystemConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  // 登录到教务系统
  async login(): Promise<boolean> {
    try {
      // 这里需要根据实际的教务系统登录流程来实现
      // 通常包括：
      // 1. 获取登录页面和验证码
      // 2. 提交登录表单
      // 3. 保存session cookie
      
      console.log('正在尝试登录教务系统...');
      
      // 示例实现（需要根据实际系统调整）
      const loginResponse = await this.client.post('/login', {
        username: this.config.username,
        password: this.config.password
      });

      if (loginResponse.status === 200) {
        this.sessionCookie = loginResponse.headers['set-cookie']?.[0];
        console.log('教务系统登录成功');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('教务系统登录失败:', error);
      return false;
    }
  }

  // 获取课程表
  async getCourseSchedule(semester?: string): Promise<CourseSchedule[]> {
    try {
      if (!this.sessionCookie) {
        const loginSuccess = await this.login();
        if (!loginSuccess) {
          throw new Error('无法登录教务系统');
        }
      }

      // 根据实际API调整
      const response = await this.client.get('/api/course-schedule', {
        headers: {
          'Cookie': this.sessionCookie
        },
        params: {
          semester: semester || 'current'
        }
      });

      // 解析课程表数据
      return this.parseCourseSchedule(response.data);
    } catch (error) {
      console.error('获取课程表失败:', error);
      throw error;
    }
  }

  // 解析课程表数据
  private parseCourseSchedule(data: any): CourseSchedule[] {
    // 这里需要根据实际返回的数据格式来解析
    // 示例实现
    const courses: CourseSchedule[] = [];
    
    if (data && Array.isArray(data.courses)) {
      data.courses.forEach((course: any) => {
        courses.push({
          courseName: course.name || '',
          courseCode: course.code || '',
          instructor: course.instructor || '',
          location: course.location || '',
          dayOfWeek: course.dayOfWeek || '',
          startTime: course.startTime || '',
          endTime: course.endTime || '',
          semester: course.semester || ''
        });
      });
    }

    return courses;
  }

  // 检查登录状态
  async checkLoginStatus(): Promise<boolean> {
    try {
      if (!this.sessionCookie) {
        return false;
      }

      const response = await this.client.get('/api/user-info', {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
