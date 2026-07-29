import { Injectable } from '@nestjs/common';

@Injectable()
export class TrackingService {
  getStatus = (): { status: string; module: string; timestamp: string } => {
    return {
      status: 'ok',
      module: 'tracking',
      timestamp: new Date().toISOString(),
    };
  };
}
