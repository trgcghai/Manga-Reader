import { validate } from 'class-validator';
import { CreateGenreDto } from './create-genre.dto';

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
