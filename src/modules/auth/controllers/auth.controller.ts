import { Controller, Get, HttpCode, HttpStatus, HttpException, Req, Body, Query } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService
  ) {}

  @Get('/connect')
  @HttpCode(HttpStatus.OK)
  async connectXero() {
    try {
        const response = await this.authService.connectXeroClient();
        return response;
    } catch (error) {
        return new HttpException({ message: error }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/callback')
  @HttpCode(HttpStatus.OK)
  async callback(@Query() query) {
    try {
        const response = await this.authService.callbackHandler(query.url);
        return response;
    } catch (error) {
        return new HttpException({ message: error }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken() {
    try {
      return await this.authService.validateToken();
    } catch (error) {
      return new HttpException({ message: error }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get('/data')
  @HttpCode(HttpStatus.OK)
  async getData(@Query() query) {
    try {
        const tenantId = query.tenantId;

        const employees = await this.authService.getEmployeeData(tenantId);

        const averageSalary = await this.authService.getAverageSalary(tenantId, employees);

        const contactResponse = await this.authService.getContacts(tenantId);

        if (employees === 'token expired' || 
            averageSalary === 'token expired' || 
            contactResponse === 'token expired' ) {
          return { error: 'Token expired' };
        }

        if (employees === 'error' || 
            averageSalary === 'error' || 
            contactResponse === 'error' ) {
          return { error: 'Unexpacted error' };
        }
        
        return { employees, averageSalary, customers: contactResponse['customers'], suppliers: contactResponse['suppliers'] };
    } catch (error) {
        console.error(error);
        return new HttpException({ message: error }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}
