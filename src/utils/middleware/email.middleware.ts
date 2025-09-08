import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        secure: false,
        port: process.env.MAIL_PORT || 587,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      });
  
    } catch (err) {
      throw new Error('Falha ao configurar o serviço de e-mail');
    }
  }

  private renderTemplate(templatePath: string, context: any): string {
    const source = fs.readFileSync(templatePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    return template(context);
  }

  async sendEmail(to: string, subject: string, file: string, variable: any) {
    try {
      const html = this.renderTemplate(
        path.join(__dirname, 'resources', file),
        variable,
      );

      await this.transporter.sendMail({
        from: process.env.MAIL_EMAIL,
        to: to,
        subject: subject,
        html: html,
      });

    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
