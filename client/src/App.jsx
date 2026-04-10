import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const title = 'MITHYA'
const subtitle = '\u092e\u093f\u0925\u094d\u092f\u093e \u2014 AI Fake News Analyzer'
const defaultReason =
  'The report does not yet contain enough corroborated signals to issue a confident authenticity call.'

const resolveVerdictFromConfidence = (confidence) => {
  if (confidence <= 40) {
    return 'FAKE'
  }

  if (confidence >= 66) {
    return 'REAL'
  }

  return 'UNCERTAIN'
}

const normalizeConfidence = (value) => {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  const scaledValue =
    numericValue >= 0 && numericValue <= 1 ? numericValue * 100 : numericValue

  return Math.max(0, Math.min(100, scaledValue))
}

const mapToCredibilityScore = (verdict, confidence) => {
  const normalizedConfidence = Math.max(0, Math.min(100, Number(confidence) || 0))

  if (verdict === 'FAKE') {
    return Math.max(0, Math.min(40, Math.round(100 - normalizedConfidence)))
  }

  if (verdict === 'UNCERTAIN') {
    return Math.max(41, Math.min(65, Math.round(normalizedConfidence)))
  }

  return Math.max(66, Math.min(100, Math.round(normalizedConfidence)))
}

const parseAnalysisPayload = (payload) => {
  if (!payload) {
    return {
      verdict: 'UNCERTAIN',
      confidence: 52,
      reason: defaultReason,
    }
  }

  const rawText =
    typeof payload.analysis === 'string'
      ? payload.analysis
      : typeof payload.reason === 'string'
        ? payload.reason
        : ''

  let structured = null

  if (rawText) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      try {
        structured = JSON.parse(jsonMatch[0])
      } catch {
        structured = null
      }
    }
  }

  const source = structured || payload
  const explicitVerdict = String(
    source.verdict ||
      source.label ||
      (/\bfake\b/i.test(rawText)
        ? 'FAKE'
        : /\breal\b|\btrue\b|\bauthentic\b/i.test(rawText)
          ? 'REAL'
          : 'UNCERTAIN'),
  ).toUpperCase()

  const normalizedConfidence = normalizeConfidence(
    source.confidence ?? source.confidenceScore ?? source.score,
  )
  let confidence = normalizedConfidence !== null
    ? normalizedConfidence
    : explicitVerdict.includes('FAKE')
      ? 82
      : explicitVerdict.includes('REAL') || explicitVerdict.includes('TRUE')
        ? 74
        : 51

  const reason =
    source.reasoning ||
    source.reason ||
    source.summary ||
    rawText ||
    defaultReason

  const lowerReason = String(reason).toLowerCase()

  if (normalizedConfidence === null) {
    if (
      /\bfalse\b|\bfabricated\b|\bhoax\b|\bmisleading\b|\bunsupported\b|\bno supporting evidence\b|\black of corroborating\b/.test(
        lowerReason,
      )
    ) {
      confidence = 20
    } else if (
      /\bverified\b|\bconfirmed\b|\bcorroborated\b|\bauthentic\b|\bcredible reporting\b/.test(
        lowerReason,
      )
    ) {
      confidence = 82
    }
  }

  const verdict =
    explicitVerdict.includes('FAKE')
      ? 'FAKE'
      : explicitVerdict.includes('REAL') || explicitVerdict.includes('TRUE')
        ? 'REAL'
        : resolveVerdictFromConfidence(confidence)

  const credibilityScore = mapToCredibilityScore(verdict, confidence)

  return {
    verdict,
    confidence,
    credibilityScore,
    reason: String(reason).trim(),
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [typedReason, setTypedReason] = useState('')
  const [displayConfidence, setDisplayConfidence] = useState(0)
  const [resultKey, setResultKey] = useState(0)
  const [titleVisibleCount, setTitleVisibleCount] = useState(0)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [subtitleFrame, setSubtitleFrame] = useState('')
  const typeTimerRef = useRef(null)
  const subtitleFrameRef = useRef(0)

  useEffect(() => {
    const revealTimer = setInterval(() => {
      setTitleVisibleCount((current) => {
        if (current >= title.length) {
          clearInterval(revealTimer)
          return current
        }

        return current + 1
      })
    }, 130)

    const subtitleTimer = setTimeout(() => {
      setSubtitleVisible(true)
    }, title.length * 130 + 220)

    return () => {
      clearInterval(revealTimer)
      clearTimeout(subtitleTimer)
    }
  }, [])

  useEffect(() => {
    if (!subtitleVisible) {
      return undefined
    }

    let frameId = 0
    let lastTick = 0
    let holdUntil = 0
    let direction = 1

    subtitleFrameRef.current = 0
    setSubtitleFrame('')

    const animate = (timestamp) => {
      if (!lastTick) {
        lastTick = timestamp
      }

      const stepDuration = direction > 0 ? 68 : 42

      if (timestamp >= holdUntil && timestamp - lastTick >= stepDuration) {
        subtitleFrameRef.current += direction
        subtitleFrameRef.current = Math.max(
          0,
          Math.min(subtitle.length, subtitleFrameRef.current),
        )
        setSubtitleFrame(subtitle.slice(0, subtitleFrameRef.current))
        lastTick = timestamp

        if (subtitleFrameRef.current >= subtitle.length) {
          direction = -1
          holdUntil = timestamp + 1400
        } else if (subtitleFrameRef.current <= 0) {
          direction = 1
          holdUntil = timestamp + 420
        }
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [subtitleVisible])

  useEffect(() => {
    setTypedReason('')

    if (!result?.reason) {
      return undefined
    }

    let index = 0
    typeTimerRef.current = window.setInterval(() => {
      index += 1
      setTypedReason(result.reason.slice(0, index))

      if (index >= result.reason.length) {
        window.clearInterval(typeTimerRef.current)
      }
    }, 16)

    return () => {
      if (typeTimerRef.current) {
        window.clearInterval(typeTimerRef.current)
      }
    }
  }, [resultKey, result])

  useEffect(() => {
    if (!result) {
      setDisplayConfidence(0)
      return undefined
    }

    let frameId = 0
    let startTime = 0
    const duration = 900
    const target = result.credibilityScore

    setDisplayConfidence(0)

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp
      }

      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplayConfidence(Math.round(target * eased))

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate)
      }
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [resultKey, result])

  const verdictTone = useMemo(() => {
    if (!result) {
      return 'uncertain'
    }

    return result.verdict.toLowerCase()
  }, [result])

  const meterPalette = useMemo(() => {
    const verdict = result?.verdict

    if (verdict === 'FAKE') {
      return {
        start: '#dc2626',
        end: '#dc2626',
      }
    }

    if (verdict === 'UNCERTAIN') {
      return {
        start: '#f59e0b',
        end: '#f59e0b',
      }
    }

    return {
      start: '#22c55e',
      end: '#22c55e',
    }
  }, [result])

  const meterGradientId = `confidence-meter-${resultKey}`
  const verdictStyle = {
    '--verdict-start': meterPalette.start,
    '--verdict-end': meterPalette.end,
  }

  const handleAnalyze = async (event) => {
    event.preventDefault()

    if (!query.trim()) {
      setError('Paste a headline, forwarded WhatsApp claim, or full article excerpt first.')
      setResult(null)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setTypedReason('')

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headline: query.trim().split('\n')[0],
          articleText: query.trim(),
          source: 'User submission',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed. Check the backend and try again.')
      }

      setResult(parseAnalysisPayload(data))
      setResultKey((current) => current + 1)
    } catch (err) {
      setError(
        err.message ||
          'The analysis service could not be reached. Make sure the server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="moving-grid" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <div className="orbital-field" aria-hidden="true">
        <span className="orbital-shape orbital-shape--one" />
        <span className="orbital-shape orbital-shape--two" />
        <span className="orbital-shape orbital-shape--three" />
      </div>
      <div className="ambient-glow ambient-glow--top" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--bottom" aria-hidden="true" />

      <section className="app-frame">
        <header className="hero-panel">
          <p className="kicker">
            Investigative AI Desk <span className="kicker-dot">•</span> India Edition
          </p>
          <h1 className="masthead" aria-label={title}>
            {title.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className={`masthead-letter${
                  index < titleVisibleCount ? ' is-visible' : ''
                }`}
              >
                {letter}
              </span>
            ))}
          </h1>
          <div className={`subtitle-shell${subtitleVisible ? ' is-visible' : ''}`}>
            <p className="subtitle">{subtitleFrame}</p>
            <span className="subtitle-caret" aria-hidden="true" />
          </div>
          <p className="hero-copy">
            Audit viral claims, suspicious headlines, and breaking news forwards with
            a darker, sharper first-pass credibility read built for Indian audiences.
          </p>
        </header>

        <section className="content-grid">
          <section className="scale-card" aria-label="Credibility scale">
            <p className="scale-title">Credibility Scale</p>
            <div className="scale-bar-wrap">
              <div className="scale-bar" aria-hidden="true" />
              {result ? (
                <div
                  className={`scale-marker scale-marker--${verdictTone}`}
                  style={{ '--marker-position': `${result.credibilityScore}%` }}
                  aria-label={`Current credibility marker at ${result.credibilityScore}%`}
                />
              ) : null}
            </div>
            <div className="scale-zones">
              <div className="scale-zone scale-zone--fake">
                <span className="scale-range">0-40</span>
                <span className="scale-name">Fake</span>
              </div>
              <div className="scale-zone scale-zone--uncertain">
                <span className="scale-range">41-65</span>
                <span className="scale-name">Uncertain</span>
              </div>
              <div className="scale-zone scale-zone--real">
                <span className="scale-range">66-100</span>
                <span className="scale-name">Real</span>
              </div>
            </div>
          </section>

          <form className="input-card" onSubmit={handleAnalyze}>
            <div className="section-head">
              <p className="section-label">Case Intake</p>
              <span className="section-meta">Headline, article, or message dump</span>
            </div>

            <textarea
              className="news-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paste a suspicious headline, article excerpt, or WhatsApp forward here..."
              rows={10}
            />

            <div className="action-row">
              <button
                className={`analyze-button${loading ? ' is-loading' : ''}`}
                type="submit"
                disabled={loading}
              >
                <span className="button-text">
                  {loading ? 'Interrogating the claim...' : 'Analyze with MITHYA'}
                </span>
              </button>
              <p className="hint-text">
                Presentation-safe contrast, animated verdicts, live API call to port 5000
              </p>
            </div>

            {error ? <p className="error-message">{error}</p> : null}
          </form>

          <section
            key={resultKey}
            className={`result-card${result ? ' is-visible' : ''} verdict-${verdictTone}`}
          >
            <div className="section-head">
              <p className="section-label">Analysis Brief</p>
              <span className="section-meta">Machine-assisted credibility signal</span>
            </div>

            {result ? (
              <>
                <div className="verdict-row">
                  <div>
                    <p className="verdict-caption">Verdict</p>
                    <h2 className="verdict-text" style={verdictStyle}>
                      {result.verdict}
                    </h2>
                  </div>
                  <div className="verdict-badge" style={verdictStyle}>
                    {result.credibilityScore}% credibility
                  </div>
                </div>

                <div className="confidence-panel confidence-panel--arc">
                  <svg
                    className="confidence-meter"
                    viewBox="0 0 160 100"
                    role="img"
                    aria-label={`Credibility meter showing ${displayConfidence}%`}
                  >
                    <defs>
                      <linearGradient id={meterGradientId} x1="20" y1="90" x2="140" y2="90">
                        <stop offset="0%" stopColor={meterPalette.start} />
                        <stop offset="100%" stopColor={meterPalette.end} />
                      </linearGradient>
                    </defs>
                    <path
                      className="confidence-arc-track"
                      d="M 20 90 A 60 60 0 0 1 140 90"
                      pathLength="100"
                    />
                    <path
                      className="confidence-arc-fill"
                      d="M 20 90 A 60 60 0 0 1 140 90"
                      pathLength="100"
                      style={{
                        '--arc-progress': displayConfidence,
                        '--arc-gradient': `url(#${meterGradientId})`,
                      }}
                    />
                    <text
                      x="80"
                      y="64"
                      textAnchor="middle"
                      className="confidence-meter-score"
                      style={{ fill: meterPalette.end }}
                    >
                      {displayConfidence}
                    </text>
                    <text x="80" y="78" textAnchor="middle" className="confidence-meter-unit">
                      /100
                    </text>
                    <text
                      x="80"
                      y="93"
                      textAnchor="middle"
                      className="confidence-meter-label"
                      style={{ fill: meterPalette.end }}
                    >
                      {result.verdict}
                    </text>
                  </svg>
                </div>

                <div className="reason-panel">
                  <p className="verdict-caption">Why MITHYA thinks so</p>
                  <p className="reason-text">
                    {typedReason}
                    <span className="typing-caret" aria-hidden="true" />
                  </p>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p className="empty-title">Awaiting a claim dossier</p>
                <p className="empty-copy">
                  Once you run an analysis, the verdict, confidence bar, and reasoning
                  brief will surface here.
                </p>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
