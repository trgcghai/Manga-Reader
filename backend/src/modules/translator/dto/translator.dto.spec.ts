import { validate } from 'class-validator';
import { CreateTranslatorDto, UpdateTranslatorDto } from './translator.dto';

describe('CreateTranslatorDto', () => {
  it('should pass with valid name and optional note', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = 'Valid Name';
    dto.note = 'Some note';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid name and no note', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateTranslatorDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateTranslatorDto', () => {
  it('should pass with valid name and note', async () => {
    const dto = new UpdateTranslatorDto();
    dto.name = 'Valid Name';
    dto.note = 'Valid note';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = new UpdateTranslatorDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
