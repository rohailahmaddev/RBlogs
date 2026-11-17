const toTime = (post) => {
  const time = new Date(
    post?.publishedAt ?? post?.createdAt
  ).getTime();

  return Number.isNaN(time) ? -Infinity : time;
};

export function getLatestPost(posts) {
  if (!Array.isArray(posts) || posts?.length === 0) {
    return null;
  }

  const latest = posts.reduce((latest, post) =>
    toTime(post) > toTime(latest) ? post : latest
  );

  return toTime(latest) === -Infinity ? null : latest;
}