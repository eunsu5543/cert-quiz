export const meta = {
  name: 'cert-batch',
  description: 'Generate NHN Cloud Essentials questions for one domain, agent-review each, return approved set',
  phases: [
    { title: 'Generate', detail: 'question-generator batches' },
    { title: 'Review', detail: 'question-reviewer per question' },
  ],
}

// args = { domain, domainName, batchSize, multiRatio, need, haveCount (참고용; need는 caller가 계산), sourcePaths, glossaryPath, avoidList }
let A = args || {}
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = {} } }
// The workflow subagent registry does not include this project's .claude/agents,
// and its cwd is the session root (not the project). So we use the default
// subagent, point it at the agent-definition files by absolute path (single
// source of truth), and absolutize all data paths against baseDir.
const baseDir = A.baseDir || 'C:/Docs/cert-quiz'
const abs = (p) => (p && p.startsWith(baseDir) ? p : `${baseDir}/${p}`)
const GEN_DEF = `${baseDir}/.claude/agents/question-generator.md`
const REV_DEF = `${baseDir}/.claude/agents/question-reviewer.md`
const need = A.need || 0
const batchSize = A.batchSize || 8
const maxRounds = Math.ceil(need / Math.max(1, batchSize)) + 8

const VERDICT = {
  type: 'object',
  required: ['verdict', 'reasons'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'reject'] },
    reasons: { type: 'array', items: { type: 'string' } },
  },
}

const approved = []
const rejectFeedback = []
let round = 0
// Soft ceiling: if generation dries up (no new approvals for DRY_LIMIT consecutive
// rounds), stop early instead of burning all rounds. Lets the domain's natural
// in-scope question pool reveal itself rather than forcing the target with trivia.
const DRY_LIMIT = 3
let dryStreak = 0

if (need === 0) {
  return { approved: [], rounds: 0, note: 'need=0, nothing to generate' }
}

while (approved.length < need && round < maxRounds) {
  round++
  const remaining = need - approved.length
  const thisBatch = Math.min(batchSize, remaining + 2) // slight over-generate to absorb rejects
  const multiRatio = A.multiRatio ?? 0.2
  const multiCount = Math.round(thisBatch * multiRatio)
  const singleCount = thisBatch - multiCount
  const avoidStems = [
    ...(A.avoidList || []).map(x => x.q),
    ...approved.map(q => q.q),
    ...rejectFeedback.slice(-12).map(r => r.q),
  ]

  const genPrompt = [
    `너는 NHN Cloud Essentials 문제 생성 에이전트다.`,
    `먼저 이 정의 파일을 Read 해서 규칙을 그대로 따른다: ${GEN_DEF}`,
    `작업 기준 디렉토리(모든 상대경로 기준): ${baseDir}`,
    ``,
    `도메인: ${A.domain} (${A.domainName})`,
    `이번 라운드 생성 개수: ${thisBatch}`,
    `문제 유형 분포: single ${singleCount}개, multi ${multiCount}개 (single=4지 1정답, multi=5지 2개 이상 정답)`,
    `참조 소스 경로 (이 안에서만 출제, 절대경로):`,
    ...(A.sourcePaths || []).map(p => `  - ${abs(p)}`),
    `glossaryPath: ${A.glossaryPath ? abs(A.glossaryPath) : ''}`,
    `idStart: ${A.domain}-tmp (dispatcher가 최종 ID 재부여하므로 임시 ID 사용)`,
    ``,
    `다음 질문들과 토픽이 겹치지 않게 생성하라 (중복 금지):`,
    ...avoidStems.map(s => `  - ${s}`),
    ...(rejectFeedback.length
      ? ['\n직전 탈락 사유(반복 금지):', ...rejectFeedback.slice(-8).map(r => `  - ${r.reasons.join('; ')}`)]
      : []),
    ``,
    `출력: v2 스키마 문제 JSON 배열만. fence/주석 없이. 너의 최종 응답 전체가 JSON.parse 대상이다.`,
  ].join('\n')

  const raw = await agent(genPrompt, {
    phase: 'Generate', label: `gen-r${round}`,
  })

  let batch
  try {
    batch = JSON.parse(raw)
  } catch {
    log(`round ${round}: JSON parse 실패, 스킵`)
    if (++dryStreak >= DRY_LIMIT) { log(`소스 고갈 추정 (dry ${dryStreak}회) — 조기 종료`); break }
    continue
  }
  batch = (Array.isArray(batch) ? batch : []).filter(q => q && !q._warning && q.q)
  if (batch.length === 0) {
    log(`round ${round}: 빈 배치`)
    if (++dryStreak >= DRY_LIMIT) { log(`소스 고갈 추정 (dry ${dryStreak}회) — 조기 종료`); break }
    continue
  }

  const reviewed = await parallel(batch.map(q => () =>
    agent(
      [
        `너는 NHN Cloud Essentials 문제 검수 에이전트다.`,
        `먼저 이 정의 파일을 Read 해서 루브릭을 그대로 따른다: ${REV_DEF}`,
        `작업 기준 디렉토리(정의 파일이 참조하는 상대경로 기준): ${baseDir}`,
        ``,
        `다음 문제를 검수하라.`,
        `question:`, JSON.stringify(q, null, 2),
        ``,
        `avoidList (중복 비교 기준):`,
        JSON.stringify((A.avoidList || []).map(x => ({ q: x.q, summary: x.summary }))
          .concat(approved.map(a => ({ q: a.q, summary: a.summary }))), null, 2),
      ].join('\n'),
      { phase: 'Review', label: `rev-r${round}`, schema: VERDICT },
    ).then(v => ({ q, v })).catch(() => null)
  ))

  let addedThisRound = 0
  for (const item of reviewed.filter(Boolean)) {
    const { q, v } = item
    if (v && v.verdict === 'pass' && approved.length < need) {
      approved.push(q)
      addedThisRound++
    } else if (v && v.verdict === 'reject') {
      rejectFeedback.push({ q: q.q, reasons: v.reasons || [] })
    }
  }
  log(`round ${round}: approved ${approved.length}/${need} (이번 추가 ${addedThisRound})`)
  if (addedThisRound === 0) {
    if (++dryStreak >= DRY_LIMIT) { log(`소스 고갈 추정 (dry ${dryStreak}회) — 조기 종료`); break }
  } else {
    dryStreak = 0
  }
}

if (approved.length < need) {
  log(`⚠ 목표 미달: ${approved.length}/${need} (rounds=${round}, dryStreak=${dryStreak}). 범위 내 소스 한계일 수 있음.`)
}

return {
  approved: approved.slice(0, need),
  count: approved.length,
  need,
  rounds: round,
  rejectedCount: rejectFeedback.length,
  rejectReasons: rejectFeedback.slice(-15),
}
