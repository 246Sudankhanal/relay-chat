import { ApiResponse } from '../../lib/ApiResponse.js';
import { RoomSlugDto } from './chat.dto.js';
import * as chatService from './chat.service.js';

export async function list(_req, res) {
  ApiResponse.success(res, { rooms: chatService.listRooms() });
}

export async function messages(req, res) {
  const { room } = RoomSlugDto.parse(req.params.slug);
  ApiResponse.success(res, { messages: await chatService.listRecentMessages(room.slug) });
}
