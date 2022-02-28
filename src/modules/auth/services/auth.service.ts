import { Injectable } from '@nestjs/common';
import { TokenSet } from 'openid-client';
import jwtDecode from 'jwt-decode';
import { XeroAccessToken, XeroIdToken, XeroClient } from 'xero-node';
import { DataService } from './data.service';


@Injectable()
export class AuthService {
  client_id = 'C43DA91AD7144204BDDFB8C2CED158BF';
  client_secret = 'V6pKuZVIPWS4KPy7Fy9HB9I9g_5bq7FGSZgPX2LpbDnvTlA4';
  redirectUrl = 'http://localhost:4200/auth';
  scopes: string = 'openid profile email payroll.employees payroll.employees.read accounting.contacts accounting.contacts.read accounting.transactions accounting.transactions.read offline_access';
  //scopes: string = '';
  xero: any;

  constructor(
    private dataService: DataService
  ) {
    this.xero = new XeroClient({
      clientId: this.client_id,
      clientSecret: this.client_secret,
      redirectUris: [this.redirectUrl],
      scopes: this.scopes.split(' '),
    });
  }

  /**
   * Connect to the Xero Client
   * @returns consentUrl
   */
  async connectXeroClient() {
    try {
      const consentUrl: string = await this.xero.buildConsentUrl();
      return { consentUrl };
    } catch(err) {
      console.error(err);
      return null;
    }
  }

  /**
   * Handling callback and receive the access token
   * @param consentUrl
   * @returns accessTokens
   */
  async callbackHandler(url: string) {
    try {
      const tokenSet: TokenSet = await this.xero.apiCallback(url);
      await this.xero.updateTenants();

      const decodedIdToken: XeroIdToken = jwtDecode(tokenSet.id_token);
      const decodedAccessToken: XeroAccessToken = jwtDecode(tokenSet.access_token);
      const allTenants = this.xero.tenants;
      const activeTenant = this.xero.tenants[0];

      return { decodedIdToken, decodedAccessToken, tokenSet, allTenants, activeTenant };
    } catch(err) {
      console.error(err);
      return null;
    }
  }
  
  /**
   * Validate the access token
   * @returns expired or not
   */
  async validateToken() {
    try {
      const tokenSet: TokenSet = await this.xero.readTokenSet();
      return tokenSet.expired();
    } catch(err) {
      console.log(err);
      return false;
    }
  }

  /**
   * Get employees' information
   * @param tenantId
   * @returns employee list
   */
  async getEmployeeData(tenantId) {
    try {
      const tokenSet: TokenSet = await this.xero.readTokenSet();
      if (!tokenSet.expired()) {
        const response = await this.xero.payrollAUApi.getEmployees(tenantId);
        const employees = response.body?.employees;
        this.dataService.updateEmployees(employees);
        return employees;
      } else {
        return 'token expired';
      }
    } catch(err) {
      console.error(err);
      return 'error';
    }
  }

  /**
   * Get average salary of all employees
   * @param tenantId
   * @param employees employee list
   * @returns average salary
   */
  async getAverageSalary(tenantId, employees) {
    try {
      const tokenSet: TokenSet = await this.xero.readTokenSet();
      if (!tokenSet.expired()) {
        // if no employees, avg salary = 0
        if (!employees.length) {
          return 0;
        }

        // sum all the salary and get the avg salary
        const employeeIds = employees.map(employee => employee.employeeID);
        let sumOfSalary = 0;
        for (let id of employeeIds) {
          const response = await this.xero.payrollAUApi.getEmployee(tenantId, id);
          if (response.body.employees?.length) {
            const payTemplate = response.body.employees[0].payTemplate;
            const earningsLines = payTemplate.earningsLines;
            const salary = earningsLines.reduce((agg, item) => {
              // annual salary or rate * noOfUnits
              if (item.annualSalary) {
                return agg + item.annualSalary;
              } else if (item.amount) {
                return agg + item.amount;
              } else if (item.ratePerUnit && item.normalNumberOfUnits) {
                return agg + item.ratePerUnit * item.normalNumberOfUnits
              } else {
                return agg;
              }
            }, 0);
            sumOfSalary += salary;
          }
        }
        return (sumOfSalary / employees.length).toFixed(2);
      } else {
        return 'token expired';
      }
    } catch(err) {
      console.error(err);
      return 'error';
    }
  }

  /**
   * Get all contacts
   * @param tenantId
   * @returns customers and suppliers
   */
  async getContacts(tenantId) {
    try {
      const tokenSet: TokenSet = await this.xero.readTokenSet();
      if (!tokenSet.expired()) {
        const contactResponse = await this.xero.accountingApi.getContacts(tenantId);
        const contacts = contactResponse.body.contacts;
        const customersRaw = contacts.filter(contact => contact.isCustomer);
        const suppliersRaw = contacts.filter(contact => contact.isSupplier);

        let customers = [], suppliers = [], customersInvoices = [], suppliersInvoices = [];
        for (const customer of customersRaw) {
          const customerInvoices = await this.getInvoices(tenantId, [customer.contactID]);
          customersInvoices = [...customersInvoices, ...customerInvoices];
          const sumOfInvoices = customerInvoices.reduce((agg, item) => agg + item.total, 0);
          customers.push({ ...customer, invoices: customerInvoices, sumOfInvoices: sumOfInvoices });
        }

        for (const supplier of suppliersRaw) {
          const supplierInvoices = await this.getInvoices(tenantId, [supplier.contactID]);
          suppliersInvoices = [...suppliersInvoices, ...supplierInvoices];
          const sumOfInvoices = supplierInvoices.reduce((agg, item) => agg + item.total, 0);
          suppliers.push({ ...supplier, invoices: supplierInvoices, sumOfInvoices: sumOfInvoices });
        }

        this.dataService.updateContacts(customers);
        this.dataService.updateContacts(suppliers);
        this.dataService.updateInvoices(customersInvoices);
        this.dataService.updateInvoices(suppliersInvoices);

        return { customers, suppliers };
      } else {
        return 'token expired';
      }
    } catch(err) {
      console.error(err);
      return 'error';
    }
  }

  /**
   * Get invoices according to contact ids
   * @param tenantId
   * @param contactIds
   * @returns all invoices of the corresponding contacts
   */
  async getInvoices(tenantId, contactIds) {
    try {
      // date last 12 month
      const date = new Date();
      date.setDate(date.getDate() - 365);
      const invoices = await this.xero.accountingApi.getInvoices(tenantId, undefined, undefined, undefined, undefined, undefined, contactIds);
      return invoices.body.invoices.filter(invoice => invoice.date > date);
    } catch(err) {
      console.error(err);
      return 'error';
    }
  }
}
