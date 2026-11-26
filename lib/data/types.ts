// 프론트와 백엔드가 함께 쓰는 "약속 파일"입니다. 두 사람 모두 동의하기 전에는 바꾸지 마세요.
// 연습용 저장소(mock.ts)와 Supabase 구현(supabase.ts)은 모두 이 모양을 지켜야 합니다.

export const MAX_GUARDIANS = 3;

export type Mode = "mock" | "supabase";
export type AuthPhase = "loading" | "signedOut" | "otpSent" | "needsProfile" | "ready";
export type LinkStatus = "pending" | "accepted";

/** 나를 지켜 주는 사람 (내가 요청한 지킴이). id = guardians 표의 연결 id */
export type Guardian = { id: string; name: string; dong: string; status: LinkStatus };

/** 내가 지켜 주는 사람 (나에게 온 요청 포함). lastCheckinAt 은 수락된 연결에서만 값이 있음 */
export type Watched = { id: string; name: string; dong: string; status: LinkStatus; lastCheckinAt: number | null };

/** 내가 지키는 사람이 보낸, 아직 끝나지 않은 SOS. 위치는 동 단위까지만 */
export type IncomingSos = { alertId: string; ownerName: string; dong: string; at: number; iAmEnRoute: boolean };

export type Notice = { id: string; at: number; kind: "reminder" | "missed" | "sos" | "info"; text: string };

export type Me = {
  nickname: string;
  dong: string;
  neighborCode: string; // 이웃이 나를 지킴이로 찾을 때 쓰는 6자리 코드
  consentedAt: number;
  lastCheckinAt: number;
  remindedAt: number | null;
  missedAt: number | null;
};

export type State = {
  mode: Mode;
  auth: AuthPhase;
  me: Me | null;
  guardians: Guardian[]; // 나를 지켜 주는 사람들
  watching: Watched[]; // 내가 지켜 주는 사람들 (대기 중인 요청 포함)
  incomingSos: IncomingSos[]; // 내가 지키는 사람들의 열린 SOS (수락된 연결만)
  notices: Notice[];
  sos: null | { alertId: string; at: number; enRoute: string[] }; // 내가 보낸 열린 SOS
};

/** 한국어 오류 문구, 성공이면 null */
export type Result = Promise<string | null>;

export interface DemoActions {
  accept(linkId: string): void;
  enRoute(): void;
  fastForward(hours: number): void;
  resetAll(): void;
}

export interface AppActions {
  requestOtp(email: string): Result; // mock: 바로 null, 아무 일도 안 함
  verifyOtp(email: string, code: string): Result;
  signOut(): Promise<void>;
  register(code: string, nickname: string, dong: string, consent: boolean): Result;
  checkin(): Result;
  addGuardian(query: string): Result; // mock: 이웃 이름, supabase: 6자리 이웃 코드
  removeGuardian(linkId: string): Result; // 양쪽 모두 가능 (거절 포함)
  acceptGuardian(linkId: string): Result;
  sendSos(): Result;
  respondEnRoute(alertId: string): Result;
  endSos(): Result;
  enablePush(): Result; // mock: 바로 null
  refresh(): Promise<void>;
  demo: DemoActions | null; // supabase 모드에서는 null → 화면의 모든 '연습용' 요소를 숨김
}

export type UseApp = () => { state: State | null; actions: AppActions };
