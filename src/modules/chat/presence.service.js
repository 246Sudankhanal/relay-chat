function presenceKey(room) {
  return `presence:${room}`;
}

export async function addMember(redis, room, user) {
  await redis.hSet(presenceKey(room), user.id, user.username);
}

export async function removeMember(redis, room, userId) {
  await redis.hDel(presenceKey(room), userId);
}

export async function listMembers(redis, room) {
  const raw = await redis.hGetAll(presenceKey(room));
  return Object.entries(raw).map(([userId, username]) => ({ userId, username }));
}
