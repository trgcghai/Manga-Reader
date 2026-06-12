import { validate } from 'class-validator';
import { UpdateGenreDto } from './update-genre.dto';

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
