import { Test, TestingModule } from '@nestjs/testing';
import { TransformationWorkshopService } from './transformation_workshop.service';

describe('TransformationWorkshopService', () => {
  let service: TransformationWorkshopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformationWorkshopService],
    }).compile();

    service = module.get<TransformationWorkshopService>(TransformationWorkshopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
