import { Test, TestingModule } from '@nestjs/testing';
import { TransformationWorkshopController } from './transformation_workshop.controller';
import { TransformationWorkshopService } from './transformation_workshop.service';

describe('TransformationWorkshopController', () => {
  let controller: TransformationWorkshopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransformationWorkshopController],
      providers: [TransformationWorkshopService],
    }).compile();

    controller = module.get<TransformationWorkshopController>(TransformationWorkshopController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
