import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    bufferLogs: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.map(e => ({
          field: e.property,
          constraints: e.constraints,
          
        }));
         return new BadRequestException({
            statusCode: 400,
            error: 'ValidationError',
            message: 'Validation failed',
            details,
         });
    }
  }))

  const config = new DocumentBuilder()
    .setTitle('`Bookstore API`')
    .setDescription('')
    .setVersion('1.0')
    .addTag('bookstore')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useLogger(app.get(Logger));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
