import { validate } from 'class-validator';
import { UpdateAuthorDto } from './update-author.dto';

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
