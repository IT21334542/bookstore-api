import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import e from 'express';
import { mkdir } from 'fs';
import { destination } from 'pino';
import { UserModule } from './user/user.module';
import { User } from './user/user.entity';


const environment = process.env.NODE_ENV || 'development';
const date = new Date().toISOString().split('T')[0];

@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal:true,
    envFilePath: environment?`.env.${environment}`:'.env',
    validationSchema: envValidationSchema
  }),
  // Logger module
  // for in production, need to set up a logger with json format as we can send to loki in future
  // for development, use pretty print
  // and for the records of debugging, we can save log in files (1. for all logs, 2. for errors only)
  LoggerModule.forRoot({
    pinoHttp:{
      genReqId:(req,res)=>{
        return req.headers['x-request-id'] || crypto.randomUUID();
      },
      redact:{
        paths:['req.headers.authorization','req.headers.cookie','req.body.password'],
        censor:'[REDACTED]'
      },
      transport:{
        targets:[
          {
            target:'pino/file',
            level:'info',
            options:{mkdir:true,append:true,destination:`./logs/all/all-${date}.log`}
          },
          {
            target:'pino/file',
            level:'error',
            options:{mkdir:true,append:true,destination:`./logs/error.log`}
          },
          environment !== 'production' ? {
            target:'pino-pretty',
            level:'debug',
            options:{ colorize:true,translateTime:'SYS:standard'} }:
          {
            target:'pino/file',
            level:'info',
            options:{mkdir:true,append:true}
          }
        ]
      }
    }
  }),
  // TypeORM module
  TypeOrmModule.forRootAsync({
    imports:[ConfigModule],
    inject:[ConfigService],
    useFactory:(configService:ConfigService)=>{
      return {
        type:'postgres',
        host:configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        ssl: configService.get<boolean>('DB_SSL'),
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        entities:[User]
      };
    },
  }),
  AuthModule,
  UserModule,
],
  
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  // constructor() {
  //   console.log(date)
  // }
}
