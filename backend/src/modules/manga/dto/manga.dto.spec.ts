import { validate } from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';
import { UpdateMangaDto } from 'src/modules/manga/dto/manga.dto';

describe('UpdateMangaDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = new UpdateMangaDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with partial fields', async () => {
    const dto = new UpdateMangaDto();
    dto.title = 'Updated Title';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all fields', async () => {
    const dto = new UpdateMangaDto();
    dto.title = 'Updated';
    dto.status = MangaStatus.COMPLETED;
    dto.description = 'New desc';
    dto.alternativeTitles = ['Alt1'];
    dto.coverPath = '/new/cover.jpg';
    dto.authors = ['Author1'];
    dto.genres = ['Genre1'];
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid status enum', async () => {
    const dto = new UpdateMangaDto();
    dto.status = 'invalid_status' as MangaStatus;
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('should reject empty title string', async () => {
    const dto = new UpdateMangaDto();
    dto.title = '';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject non-string items in authors array', async () => {
    const dto = new UpdateMangaDto();
    dto.authors = [123] as unknown as string[];
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'authors')).toBe(true);
  });

  it('should accept empty array for authors', async () => {
    const dto = new UpdateMangaDto();
    dto.authors = [];
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
