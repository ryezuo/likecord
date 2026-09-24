import { Module, Global } from "@nestjs/common";
import { WsGateway } from "./ws.gateway";
import { SessionModule } from "../session/session.module";
import { WsSessionRegistryService } from "./ws-session-registry.service";

@Global()
@Module({
  imports: [SessionModule],
  providers: [WsGateway, WsSessionRegistryService],
  exports: [WsGateway, WsSessionRegistryService],
})
export class WsModule {}
