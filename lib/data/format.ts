// 시각을 쉬운 말로 바꿔 주는 도우미 (연습용/실제 모드 모두 사용)

// "오늘 오전 9:12" / "어제 오후 3:05" / "11월 24일 오전 11:51"
export function formatLast(ts: number, now: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === new Date(now).toDateString()) return `오늘 ${time}`;
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return `어제 ${time}`;
  return `${d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ${time}`;
}

export function formatAgo(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간 전`;
}
