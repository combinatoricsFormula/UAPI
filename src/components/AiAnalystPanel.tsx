import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  TrendingUp,
  Link2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { AiAnalysisResult, DataSource } from '../types/connector';

interface AiAnalystPanelProps {
  sources: DataSource[];
}

export const AiAnalystPanel: React.FC<AiAnalystPanelProps> = ({ sources }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQuestions = [
    'Synthesize a cross-source executive overview across all connected data streams',
    'Correlate customers between e-commerce orders and support helpdesk tickets',
    'Identify operational anomalies, warning thresholds, or payment outliers',
    'Analyze temporal trends, volume velocity, and data health across sources',
  ];

  const runAnalysis = async (queryText?: string) => {
    const q = queryText || question;
    if (sources.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: sources.map(s => ({
            id: s.id,
            name: s.name,
            connectorType: s.connectorType,
            rowCount: s.records.length,
            schema: s.schema.map(f => ({ name: f.name, type: f.type })),
            records: s.records.slice(0, 10),
          })),
          question: q,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analysis service responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        throw new Error('Unexpected response format from analysis engine.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Unified AI Intelligence & Cross-Source Synthesis
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Ask questions across all connected heterogeneous data endpoints. The intelligence engine correlates schemas,
          identifies cross-source overlap, and uncovers actionable insights.
        </p>
      </div>

      {/* Query Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (question.trim()) runAnalysis();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question across all connected sources (e.g. 'Correlate sales with support tickets')..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim() || sources.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Analyze</span>
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <Lightbulb className="h-3 w-3 text-amber-400" />
            Suggested Prompts:
          </span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(q);
                runAnalysis(q);
              }}
              className="text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-800 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-red-300">
          <span className="font-semibold">Analysis Notice:</span> {error}
        </div>
      )}

      {/* Analysis Output */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Executive Headline & Summary */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 uppercase">
                Cross-Source Intelligence
              </span>
              <span className="text-xs text-slate-400">
                Synthesized across {sources.length} active connectors
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {analysisResult.headline}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {analysisResult.summary}
            </p>
          </div>

          {/* Key Metrics */}
          {analysisResult.keyMetrics && analysisResult.keyMetrics.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-3 uppercase tracking-wider">
                Cross-Source Key Metrics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analysisResult.keyMetrics.map((km, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50">
                    <span className="text-[11px] text-slate-400 block mb-1">{km.label}</span>
                    <div className="text-lg font-bold text-white font-mono tabular-nums">
                      {km.value}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{km.subtext}</span>
                      <span className="text-indigo-400">{km.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Source Correlations */}
          {analysisResult.crossSourceCorrelations && analysisResult.crossSourceCorrelations.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-semibold text-white tracking-wide uppercase">
                  Cross-Source Correlation Findings
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysisResult.crossSourceCorrelations.map((corr, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{corr.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {corr.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{corr.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {analysisResult.actionableInsights && analysisResult.actionableInsights.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-white tracking-wide uppercase">
                  Actionable Next Steps & Optimization
                </h4>
              </div>
              <div className="space-y-2">
                {analysisResult.actionableInsights.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-mono mt-0.5">0{i + 1}.</span>
                    <p className="leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
          <Sparkles className="h-8 w-8 text-indigo-400/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Unified Intelligence Ready</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Click any suggested prompt above or type a custom question to cross-correlate all connected endpoints.
          </p>
          <button
            onClick={() => runAnalysis(sampleQuestions[0])}
            disabled={sources.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Run Cross-Source Synthesis
          </button>
        </div>
      )}
    </div>
  );
};
