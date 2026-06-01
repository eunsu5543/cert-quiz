export const meta = {
  name: 'cert-batch',
  description: 'Generate NHN Cloud Essentials questions for one domain, agent-review each, return approved set',
  phases: [
    { title: 'Generate', detail: 'question-generator batches' },
    { title: 'Review', detail: 'question-reviewer per question' },
  ],
}

// args = { domain, domainName, batchSize, need, haveCount, sourcePaths, glossaryPath, avoidList }
const A = args || {}
const need = A.need || 0
const batchSize = A.batchSize || 8
const maxRounds = Math.ceil(need / Math.max(1, batchSize)) + 5

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

if (need === 0) {
  return { approved: [], rounds: 0, note: 'need=0, nothing to generate' }
}

while (approved.length < need && round < maxRounds) {
  round++
  const remaining = need - approved.length
  const thisBatch = Math.min(batchSize, remaining + 2) // slight over-generate to absorb rejects
  const avoidStems = [
    ...(A.avoidList || []).map(x => x.q),
    ...approved.map(q => q.q),
    ...rejectFeedback.slice(-12).map(r => r.q),
  ]

  const genPrompt = [
    `도메인: ${A.domain} (${A.domainName})`,
    `이번 라운드 생성 개수: ${thisBatch}`,
    `참조 소스 경로 (이 안에서만 출제):`,
    ...(A.sourcePaths || []).map(p => `  - ${p}`),
    `glossaryPath: ${A.glossaryPath || ''}`,
    `idStart: ${A.domain}-tmp (dispatcher가 최종 ID 재부여하므로 임시 ID 사용)`,
    ``,
    `다음 질문들과 토픽이 겹치지 않게 생성하라 (중복 금지):`,
    ...avoidStems.map(s => `  - ${s}`),
    rejectFeedback.length ? `\n직전 탈락 사유(반복 금지):` : ``,
    ...rejectFeedback.slice(-8).map(r => `  - ${r.reasons.join('; ')}`),
    ``,
    `출력: v2 스키마 문제 JSON 배열만. fence/주석 없이.`,
  ].join('\n')

  const raw = await agent(genPrompt, {
    agentType: 'question-generator', phase: 'Generate', label: `gen-r${round}`,
  })

  let batch
  try {
    batch = JSON.parse(raw)
  } catch {
    log(`round ${round}: JSON parse 실패, 스킵`)
    continue
  }
  batch = (Array.isArray(batch) ? batch : []).filter(q => q && !q._warning && q.q)
  if (batch.length === 0) { log(`round ${round}: 빈 배치`); continue }

  const reviewed = await parallel(batch.map(q => () =>
    agent(
      [
        `다음 문제를 검수하라.`,
        `question:`, JSON.stringify(q, null, 2),
        ``,
        `avoidList (중복 비교 기준):`,
        JSON.stringify((A.avoidList || []).map(x => ({ q: x.q, summary: x.summary }))
          .concat(approved.map(a => ({ q: a.q, summary: a.summary }))), null, 2),
      ].join('\n'),
      { agentType: 'question-reviewer', phase: 'Review', label: `rev-r${round}`, schema: VERDICT },
    ).then(v => ({ q, v })).catch(() => null)
  ))

  for (const item of reviewed.filter(Boolean)) {
    const { q, v } = item
    if (v && v.verdict === 'pass' && approved.length < need) {
      approved.push(q)
    } else if (v && v.verdict === 'reject') {
      rejectFeedback.push({ q: q.q, reasons: v.reasons || [] })
    }
  }
  log(`round ${round}: approved ${approved.length}/${need} (이번 통과 ${reviewed.filter(x => x && x.v && x.v.verdict === 'pass').length})`)
}

if (approved.length < need) {
  log(`⚠ 목표 미달: ${approved.length}/${need} (rounds=${round}). 부족분은 다음 실행에서 채울 것.`)
}

return {
  approved: approved.slice(0, need),
  count: approved.length,
  need,
  rounds: round,
  rejectedCount: rejectFeedback.length,
  rejectReasons: rejectFeedback.slice(-15),
}
