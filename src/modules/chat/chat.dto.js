import config from '../../config.js';
import { NotFoundError, ValidationError } from '../../errors/AppError.js';

export class RoomSlugDto {
  constructor(room) {
    this.room = room;
  }

  static parse(slug) {
    const value = String(slug ?? '').trim();
    const room = config.rooms.find((item) => item.slug === value);
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    return new RoomSlugDto(room);
  }
}

export class CreateMessageDto {
  constructor(text) {
    this.text = text;
  }

  static parse(text) {
    const value = String(text ?? '').trim();
    if (!value || value.length > 2000) {
      throw new ValidationError('Invalid request body', [
        { field: 'text', message: 'Message must be 1-2000 characters' },
      ]);
    }
    return new CreateMessageDto(value);
  }
}
