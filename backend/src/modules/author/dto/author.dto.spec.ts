import { validate } from 'class-validator';
import { CreateAuthorDto, UpdateAuthorDto } from './author.dto';

describe('CreateAuthorDto', () => {
  it('should pass with valid name', async () => {
    const dto = new CreateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateAuthorDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateAuthorDto', () => {
  it('should pass with valid name', async () => {
    const dto = new UpdateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = new UpdateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
