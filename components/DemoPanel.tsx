"use client";
import type { Actions, State } from "@/lib/store";
import { Icon } from "./Icons";
import { Ar } from "./Ui";

// 연습용 도구: 24시간·48시간을 기다리지 않고 알림이 어떻게 보이는지 미리 볼 수 있어요.
export default function DemoPanel({ state, actions }: { state: State; actions: Actions }) {
  const demo = actions.demo;
  if (!demo) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">연습용 도구</h2>
      <p className="t-body text-ink-muted">
        진짜 서비스에는 없는 메뉴예요. 시간을 빨리 감아서 알림이 어떻게 뜨는지 확인해 보세요.
      </p>

      <button className="btn btn-dashed flex-col !items-start text-left" onClick={() => demo.fastForward(25)}>
        25시간이 지난 것으로 만들기
        <span className="t-caption text-ink-muted">본인 재알림(24시간) 확인</span>
      </button>
      <button className="btn btn-dashed flex-col !items-start text-left" onClick={() => demo.fastForward(49)}>
        49시간이 지난 것으로 만들기
        <span className="t-caption text-ink-muted">지킴이 알림(48시간) 확인</span>
      </button>
      <p className="t-caption text-ink-muted">
        누른 뒤 ‘홈’이나 ‘알림 소식’으로 가면 상태와 기록이 바뀌어 있어요. ‘저 괜찮아요’를 누르면 다시 처음으로 돌아가요.
      </p>

      <div className="flex flex-col gap-2 rounded-lg bg-sos-soft p-5 text-sos-ink">
        <p className="t-caption font-bold">지킴이 이웃이 받는 알림 미리보기 (48시간)</p>
        <p className="t-heading flex items-center gap-2">
          <Icon name="alert" size={30} className="shrink-0" />
          도움 필요 · 이틀째 안부가 없어요
        </p>
        <p className="t-body">{state.me?.nickname ?? "OO"}님의 안부가 이틀째 없어요. 전화로 먼저 확인해 주세요.</p>
        <ol className="t-body list-decimal pl-6">
          <li>먼저 전화해 보세요.</li>
          <li>연락이 안 되면 댁에 찾아가 문을 두드려 보세요.</li>
          <li>그래도 응답이 없고 걱정되면 119 또는 112에 알려 주세요.</li>
        </ol>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => {
          if (confirm("연습 데이터를 모두 지우고 처음부터 다시 할까요?")) demo.resetAll();
        }}
      >
        연습 데이터 모두 지우기
        <Ar icon="check" />
      </button>
    </section>
  );
}
