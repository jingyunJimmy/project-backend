import { Injectable } from '@nestjs/common';
import { CONTACTS_FILE, EMPLOYEES_FILE, INVOICES_FILE } from '@configs/data.config';
import * as fs from 'fs';

@Injectable()
export class DataService {
    path = 'src/data/';

    constructor() {}

    updateEmployees(employees) {
        try {
            const data = fs.readFileSync(this.path + EMPLOYEES_FILE, { encoding:'utf8', flag:'r' });
            const existingEmployees = JSON.parse(data.toString());
            for (let i = 0; i < existingEmployees.length; i++) {
                const obj = employees.find(e => e.employeeID === existingEmployees[i].employeeID);
                if (obj) {
                    existingEmployees[i] = obj;
                }
            }
            const existingEmployeeIds = existingEmployees.map(e => e.employeeID);
            const newEmployees = employees.filter(e => !existingEmployeeIds.includes(e.employeeID));
            const newData = JSON.stringify([...existingEmployees, ...newEmployees], null, 2);
            fs.writeFileSync(this.path + EMPLOYEES_FILE, newData);
        } catch(err) {
            console.error(err);
        }
    }

    updateContacts(contacts) {
        try {
            const data = fs.readFileSync(this.path + CONTACTS_FILE, { encoding:'utf8', flag:'r' });
            const existingContacts = JSON.parse(data.toString());
            for (let i = 0; i < existingContacts.length; i++) {
                const obj = contacts.find(e => e.contactID === existingContacts[i].contactID);
                if (obj) {
                    existingContacts[i] = obj;
                }
            }
            const existingContactIds = existingContacts.map(e => e.contactID);
            const newContacts = contacts.filter(e => !existingContactIds.includes(e.contactID));
            const newData = JSON.stringify([...existingContacts, ...newContacts], null, 2);
            fs.writeFileSync(this.path + CONTACTS_FILE, newData);
        } catch(err) {
            console.error(err);
        }
    }

    updateInvoices(invoices) {
        try {
            const data = fs.readFileSync(this.path + INVOICES_FILE, { encoding:'utf8', flag:'r' });
            const existingInvoices = JSON.parse(data.toString());
            for (let i = 0; i < existingInvoices.length; i++) {
                const obj = invoices.find(e => e.incoiesID === existingInvoices[i].invoiceID);
                if (obj) {
                    existingInvoices[i] = obj;
                }
            }
            const existingInvoiceIds = existingInvoices.map(e => e.invoiceID);
            const newInvoices = invoices.filter(e => !existingInvoiceIds.includes(e.invoiceID));
            const newData = JSON.stringify([...existingInvoices, ...newInvoices], null, 2);
            fs.writeFileSync(this.path + INVOICES_FILE, newData);
        } catch(err) {
            console.error(err);
        }
    }
}