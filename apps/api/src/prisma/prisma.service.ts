import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
