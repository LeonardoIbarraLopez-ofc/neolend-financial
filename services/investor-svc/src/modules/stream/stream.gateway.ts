import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createLogger } from '@neolend/ts-common';

const log = createLogger('investor-svc:ws');

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'v1/portfolio/stream',
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    log.info({ socketId: client.id }, 'Cliente inversionista conectado por WebSocket');
  }

  handleDisconnect(client: Socket) {
    log.info({ socketId: client.id }, 'Cliente inversionista desconectado');
  }

  broadcastMetricsUpdate(metrics: any) {
    if (this.server) {
      this.server.emit('metrics.update', metrics);
      log.info('Broadcast de métricas de cartera enviado por WS');
    }
  }

  broadcastProjectionUpdate(projection: any) {
    if (this.server) {
      this.server.emit('projection.update', projection);
      log.info('Broadcast de proyección de caja enviado por WS');
    }
  }
}
