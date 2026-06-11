import { validate } from 'class-validator';
import { CreateMangaDto } from './create-manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';

describe('CreateMangaDto', () => {
  it('should pass with valid data', async () => {
    const dto = new CreateMangaDto();
    dto.title = 'One Piece';
    dto.status = MangaStatus.ONGOING;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when title is empty', async () => {
    const dto = new CreateMangaDto();
    dto.title = '';
    dto.status = MangaStatus.ONGOING;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('title');
  });

  it('should fail when status is invalid', async () => {
    const dto = new CreateMangaDto();
    dto.title = 'Test';
    dto.status = 'invalid_status' as MangaStatus;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('should pass with all optional fields', async () => {
    const dto = new CreateMangaDto();
    dto.title = 'Naruto';
    dto.status = MangaStatus.COMPLETED;
    dto.description = 'A story about ninjas';
    dto.alternativeTitles = ['ナルト'];
    dto.coverPath = '/covers/naruto.jpg';
    dto.authors = ['Masashi Kishimoto'];
    dto.genres = ['Action', 'Adventure'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
