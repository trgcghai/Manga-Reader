import { validate } from 'class-validator';
import { CreateGenreDto, UpdateGenreDto } from './genre.dto';

describe('CreateGenreDto', () => {
  it('should pass with valid name', async () => {
    const dto = new CreateGenreDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateGenreDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateGenreDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateGenreDto', () => {
  it('should pass with valid name', async () => {
    const dto = new UpdateGenreDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = new UpdateGenreDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
